// --- server.js (Unified Analyzer - Final ESLint Fix) ---

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { nanoid } = require('nanoid');
const { exec } = require('child_process');
const tmp = require('tmp');
const fs = require('fs-extra');
const path = require('path');

// Linters
const { ESLint } = require('eslint');
const { HtmlValidate } = require('html-validate');
const stylelint = require('stylelint');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const dbURI = 'mongodb://localhost:27017/codebinDB';
mongoose.connect(dbURI)
  .then(() => console.log('✅ MongoDB connected successfully.'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// --- Mongoose Schema & Model ---
const SnippetSchema = new mongoose.Schema({
  content: { type: String, required: true },
  language: { type: String, required: true },
  uniqueId: {
    type: String,
    required: true,
    unique: true,
    default: () => nanoid(7)
  }
}, { timestamps: true });

const Snippet = mongoose.model('Snippet', SnippetSchema);

// --- Snippet CRUD endpoints ---
app.post('/api/snippets', async (req, res) => {
  try {
    const { content, language } = req.body;
    if (!content) { return res.status(400).json({ message: 'Content cannot be empty.' }); }
    const newSnippet = new Snippet({ content, language: language || 'plaintext' });
    await newSnippet.save();
    res.status(201).json({ id: newSnippet.uniqueId });
  } catch (error) {
    console.error('Error creating snippet:', error);
    res.status(500).json({ message: 'Server error during snippet creation.' });
  }
});

app.get('/api/snippets/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const snippet = await Snippet.findOne({ uniqueId: id });
    if (!snippet) { return res.status(404).json({ message: 'Snippet not found.' }); }
    res.status(200).json(snippet);
  } catch (error) {
    console.error('Error fetching snippet:', error);
    res.status(500).json({ message: 'Server error during snippet retrieval.' });
  }
});

// --- Unified Analyzer Endpoint ---
app.post('/api/analyze/code', async (req, res) => {
  const { code, language } = req.body;
  if (!code || !language) { return res.status(400).json({ error: 'Code and language are required.' }); }

  let results = [];
  let tempFilePath = null;
  let cleanupCallback = () => {};

  try {
    const tempFile = tmp.fileSync({ postfix: getExtension(language) });
    tempFilePath = tempFile.name;
    cleanupCallback = tempFile.removeCallback;
    await fs.writeFile(tempFilePath, code);

    switch (language) {
      case 'javascript': results = await analyzeJavaScript(code); break;
      case 'html': results = await analyzeHtml(code); break;
      case 'python': results = await analyzePython(tempFilePath); break;
      case 'css': results = await analyzeCss(code); break;
      case 'java': results = await analyzeJava(tempFilePath); break;
      default: break;
    }
    res.json(results);

  } catch (error) {
    console.error(`Error analyzing ${language}:`, error);
    res.status(500).json([{ line: 1, column: 1, message: `Server error during ${language} analysis: ${error.message || error}`, severity: 'error' }]);
  } finally {
    if (cleanupCallback) cleanupCallback();
  }
});

// --- Helper Functions ---

function getExtension(language) {
  switch (language) {
    case 'javascript': return '.js';
    case 'html': return '.html';
    case 'python': return '.py';
    case 'css': return '.css';
    case 'java': return '.java';
    default: return '.txt';
  }
}

async function analyzeJavaScript(code) {
  // Import globals for the new config format
  const globals = require("globals");

  const eslint = new ESLint({
      // Force ESLint to use ONLY the overrideConfig below
      overrideConfigFile: true,
      // Use the new "flat config" format within overrideConfig
      overrideConfig: {
          // No 'root: true' needed here when overrideConfigFile is true
          languageOptions: {
              ecmaVersion: "latest",
              sourceType: "module",
              globals: {
                  ...globals.browser, // Add browser environment globals (like 'console', 'document')
                  // Add other environments if needed, e.g., ...globals.node
              }
          },
          rules: {
              "no-undef": "error",
              "no-unused-vars": "warn",
              "no-redeclare": "error",
              "constructor-super": "error", // Still relevant for classes
              "no-dupe-keys": "error",
              "no-const-assign": "error" // Rule for const reassignment
          }
      },
      fix: false // Ensure fix mode is off
  });

  try {
      const lintResults = await eslint.lintText(code);
      // Check for results and messages safely
      const messages = lintResults?.[0]?.messages ?? [];
      return messages.map(msg => ({
        line: msg.line,
        column: msg.column,
        message: msg.message,
        severity: msg.severity === 2 ? 'error' : 'warning' // 2 is error, 1 is warning
      }));
  } catch (error) {
      console.error("ESLint execution error:", error);
      return [{ line: 1, column: 1, message: `ESLint analysis failed: ${error.message}`, severity: 'error' }];
  }
}

async function analyzeHtml(code) {
  const htmlvalidate = new HtmlValidate();
  const report = await htmlvalidate.validateString(code);
  if (!report.valid) {
      return report.results[0]?.messages.map(msg => ({
        line: msg.line,
        column: msg.column,
        message: msg.message,
        severity: msg.severity === 2 ? 'error' : 'warning'
      })) || [];
  }
  return [];
}


async function analyzeCss(code) {
   try {
        const lintResults = await stylelint.lint({
            code: code,
            config: {
                 extends: ["stylelint-config-standard"],
                 rules: { "indentation": 2 }
            },
            configBasedir: __dirname
        });
        return lintResults.results[0]?.warnings.map(warn => ({
            line: warn.line,
            column: warn.column,
            message: warn.text.replace(` (${warn.rule})`, ''),
            severity: warn.severity
        })) || [];
    } catch (error) {
       console.error("Stylelint error:", error);
       return [{line: 1, column: 1, message: `Stylelint execution error: ${error.message}`, severity: 'error'}];
    }
}


async function analyzePython(filePath) {
  let syntaxResults = [];
  let lintResults = [];

  try {
    await runCommand(`py -m py_compile "${filePath}"`);
  } catch (errorOutput) {
    const lines = String(errorOutput).split('\n');
    let lineNumber = 1;
    let message = 'Invalid Syntax';
    const lineMatch = String(errorOutput).match(/File ".*", line (\d+)/);
    if (lineMatch && lineMatch[1]) lineNumber = parseInt(lineMatch[1], 10);
    if (lines.length > 1) {
      const errorLine = lines[lines.length - 2]?.trim();
      if (errorLine) message = errorLine;
    }
    syntaxResults.push({ line: lineNumber, column: 1, message: message, severity: 'error' });
    return syntaxResults;
  }

  try {
    const flake8Output = await runCommand(`py -m flake8 --format="%(row)d:%(col)d:%(code)s:%(text)s" "${filePath}"`);
    const lines = flake8Output.split('\n');
    for (const line of lines) {
      if (line) {
        const parts = line.split(':');
        if (parts.length >= 4) {
          lintResults.push({
            line: parseInt(parts[0], 10),
            column: parseInt(parts[1], 10),
            message: parts.slice(3).join(':').trim(),
            severity: 'warning'
          });
        }
      }
    }
  } catch (flake8ErrorOutput) { /* Ignore flake8 stderr if py_compile passed */ }

  return [...syntaxResults, ...lintResults];
}


async function analyzeJava(filePath) {
   const fileDir = path.dirname(filePath);
   try {
      await runCommand(`javac "${filePath}"`, { cwd: fileDir });
      return [];
   } catch (errorOutput) {
      const results = [];
      const lines = String(errorOutput).split('\n');
      const errorRegex = /^(.+\.java):(\d+):\s*(?:error:|warning:)\s*(.*)/;
      for (const line of lines) {
          const match = line.match(errorRegex);
          if (match) {
              results.push({
                  line: parseInt(match[2], 10),
                  column: 1,
                  message: match[3].trim(),
                  severity: line.includes(': error:') ? 'error' : 'warning'
              });
          }
      }
      if (results.length === 0 && errorOutput) {
          results.push({ line: 1, column: 1, message: `Java compilation failed: ${errorOutput.split('\n')[0]}`, severity: 'error' });
      }
      return results;
   }
}

function runCommand(command, options = {}) {
  return new Promise((resolve, reject) => {
    exec(command, options, (error, stdout, stderr) => {
      if (error) {
         reject(stderr || error.message);
      } else {
         resolve(stdout);
      }
    });
  });
}

// --- Start the Server ---
app.listen(PORT, () => {
  console.log(`🚀 API Server running on http://localhost:${PORT}`);
});