import React, { useState, useEffect } from 'react'; // Removed useRef
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Card, Spinner, Button, Container, ListGroup } from 'react-bootstrap'; // Removed Alert
import Editor from '@monaco-editor/react';
import { toast } from 'react-hot-toast';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { FaPlus, FaPlayCircle, FaCheckCircle, FaTimesCircle, FaCopy } from 'react-icons/fa';

const SnippetPage = ({ theme }) => {
  const { id } = useParams();
  const [snippet, setSnippet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Analysis state
  const [analysis, setAnalysis] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    const fetchSnippet = async () => {
      try {
        setLoading(true); setError('');
        const response = await axios.get(`http://localhost:5000/api/snippets/${id}`);
        setSnippet(response.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Snippet not found.');
      } finally {
        setLoading(false);
      }
    };
    fetchSnippet();
  }, [id]);

  // handleEditorDidMount is minimal now
  function handleEditorDidMount(editor, _theMonacoInstance) {
     // No setup needed here for analysis
  }

  // --- Simplified Process Markers ---
  const processMarkers = (markers) => {
    if (!markers || markers.length === 0) {
      setAnalysis([{ type: 'success', message: 'No errors or warnings found. This code looks clean!' }]);
    } else {
      const formattedSuggestions = markers.map(marker => {
        let customSuggestion = `Suggestion: Review the error: ${marker.message}`;
         // Add specific suggestions if needed based on marker content
        if (marker.message?.includes("Invalid syntax")) { customSuggestion = `Suggestion: ${marker.message}. Check for typos, missing colons, or incorrect indentation.`; }
        if (marker.message?.includes("is not defined")) { customSuggestion = `Suggestion: Make sure the variable or function is defined and spelled correctly.`; }
        if (marker.message?.includes("Cannot assign to") && marker.message?.includes("constant")) { customSuggestion = `Suggestion: 'const' variables cannot be reassigned. Use 'let' if the value needs to change.`; }
        // Add more specific suggestions here

        return {
          type: marker.severity === 'error' ? 'danger' : 'warning',
          line: marker.line || 1,
          message: marker.message || 'Unknown error detail',
          suggestion: customSuggestion
        };
      });
      setAnalysis(formattedSuggestions);
    }
    setIsAnalyzing(false);
  };

  // --- Simplified Analyze Function ---
  const handleAnalyzeCode = async () => {
    if (!snippet) return;

    setIsAnalyzing(true);
    setAnalysis([]);

    try {
      // Call the unified back-end endpoint
      const response = await axios.post('http://localhost:5000/api/analyze/code', {
        code: snippet.content,
        language: snippet.language
      });
      processMarkers(response.data); // Process the standardized results
    } catch (err) {
      console.error("Error calling analysis API:", err);
      // Display error from backend if available, otherwise generic message
      const errorMsg = err.response?.data?.error || err.response?.data?.[0]?.message || 'Error analyzing code on server.';
      setAnalysis([{ type: 'danger', line: 1, message: errorMsg }]);
      setIsAnalyzing(false);
    }
  };

  const onCopyCode = () => {
    toast.success('Code copied to clipboard!');
  };

  // --- Loading and Error states ---
  if (loading) { return ( <Container className="text-center mt-5"><Spinner animation="border" /><p>Loading Snippet...</p></Container> ); }
  // Simplified error display
  if (error) { return ( <Container className="mt-5 text-danger"><h4>Error Loading Snippet</h4><p>{error}</p><Button as={Link} to="/" variant="danger">Go Home</Button></Container> ); }


  return (
    <Container fluid className="mb-4">
      <Button as={Link} to="/" variant="secondary" className="mb-3"> <FaPlus className="me-2" /> Create New Snippet </Button>
      {snippet && (
        <Card className="editor-card">
          <Card.Header>
            Language: <strong>{snippet.language}</strong> | Created: {new Date(snippet.createdAt).toLocaleString()}
          </Card.Header>
          <Card.Body>
            <Editor
              height="60vh"
              theme={theme === 'dark' ? 'vs-dark' : 'vs-light'}
              language={snippet.language}
              value={snippet.content}
              onMount={handleEditorDidMount} // Keep onMount
              options={{
                readOnly: true, domReadOnly: true, minimap: { enabled: true },
                validate: true // Monaco still provides its own validation squiggles
              }}
            />
          </Card.Body>
          <Card.Footer>
            <div className="d-flex align-items-center">
              {/* Analyze Button */}
              <Button variant="success" onClick={handleAnalyzeCode} className="py-2" disabled={isAnalyzing}>
                 {isAnalyzing ? ( <Spinner as="span" animation="border" size="sm" /> ) : ( <FaPlayCircle className="me-2" /> )} Analyze Code
              </Button>
              {/* Copy Button */}
              <CopyToClipboard text={snippet.content} onCopy={onCopyCode}>
                <Button variant="primary" className="ms-2 py-2"> <FaCopy className="me-2" /> Copy Code </Button>
              </CopyToClipboard>
            </div>
            {/* Analysis Results */}
            {analysis.length > 0 && (
              <div className="mt-4">
                <h4>Analysis Results:</h4>
                <ListGroup className="analysis-list">
                  {analysis.map((item, index) => (
                    <ListGroup.Item
                      key={index}
                      className={theme === 'light' ? 'bg-light text-dark' : 'bg-dark text-light'}
                    >
                      {item.type === 'success' ? (
                        <strong className="text-success"><FaCheckCircle className="me-2" />{item.message}</strong>
                      ) : (
                        <>
                          <strong className={item.type === 'danger' ? 'text-danger' : 'text-warning'}>
                            <FaTimesCircle className="me-2" /> Line {item.line}:
                          </strong> {item.message}
                          <br />
                          <small>{item.suggestion}</small>
                        </>
                      )}
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              </div>
            )}
          </Card.Footer>
        </Card>
      )}
    </Container>
  );
};

export default SnippetPage;