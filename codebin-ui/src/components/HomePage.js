import React, { useState } from 'react';
// 1. Import Row and Col from react-bootstrap
import { Form, Button, Card, Container, Spinner, Alert, Row, Col } from 'react-bootstrap';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';

// 2. Import all the icons we need
import { 
  FaSave, 
  FaTerminal, 
  FaJsSquare, 
  FaPython, 
  FaHtml5, 
  FaCss3Alt, 
  FaJava, 
  FaFileAlt 
} from 'react-icons/fa';

// 3. Create a helper array for our icons to keep the code clean
const languages = [
  { name: 'javascript', icon: FaJsSquare, className: 'javascript' },
  { name: 'python',     icon: FaPython,   className: 'python' },
  { name: 'html',       icon: FaHtml5,    className: 'html' },
  { name: 'css',        icon: FaCss3Alt,  className: 'css' },
  { name: 'java',       icon: FaJava,     className: 'java' },
  { name: 'plaintext',  icon: FaFileAlt,  className: 'plaintext' },
];

const HomePage = ({ theme }) => {
  const [content, setContent] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // This is a URL to a royalty-free image.
  const heroImageUrl = 'https://images.unsplash.com/photo-1550439062-609e1531270e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80';


  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const response = await axios.post('http://localhost:5000/api/snippets', {
        content,
        language
      });
      navigate(`/snippet/${response.data.id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save snippet. Try again.');
      setIsLoading(false);
    }
  };
  
  function handleEditorChange(value, event) {
    setContent(value);
  }

  return (
    <Container fluid>
      
      {/* Redesigned Hero Section with Image */}
      <div className="hero-section">
        <Row className="align-items-center">
          <Col md={7} className="text-md-start text-center">
            <div className="hero-icon">
              <FaTerminal />
            </div>
            <h1>Share & Analyze Code</h1>
            <p className="lead">
              Paste your code, save it, and get instant analysis. Errors are
              highlighted just like in your editor.
            </p>
          </Col>
          <Col md={5} className="d-none d-md-block">
            <img 
              src={heroImageUrl}
              alt="Code on a screen"
              style={{ 
                width: '100%', 
                borderRadius: '0.75rem', 
                boxShadow: '0 8px 16px rgba(0,0,0,0.3)' 
              }} 
            />
          </Col>
        </Row>
      </div>

      <Card className="editor-card mb-4">
        <Card.Header as="h3" className="text-center">Create New Snippet</Card.Header>
        <Card.Body>
          <Form onSubmit={handleSubmit}>

            {/* THIS IS THE NEW LAYOUT */}
            <Row>

              {/* COLUMN 1: The new vertical icon bar */}
              <Col xs={2} md={2} lg={1} className="language-icon-bar">
                <Form.Label className="mb-3" style={{fontWeight: 'bold', fontSize: '0.9rem'}}>Language</Form.Label>
                {languages.map((lang) => (
                  <lang.icon
                    key={lang.name}
                    title={lang.name} // This adds the hover tooltip
                    className={`lang-icon ${lang.className} ${language === lang.name ? 'active' : ''}`}
                    onClick={() => setLanguage(lang.name)}
                  />
                ))}
              </Col>

              {/* COLUMN 2: The code editor and save button */}
              <Col xs={10} md={10} lg={11}>
                <Form.Group className="mb-3">
                  <Form.Label>Code</Form.Label>
                  <div style={{ border: '1px solid var(--border-dark)', borderRadius: '.25rem', overflow: 'hidden' }}>
                    <Editor
                      height="60vh"
                      theme={theme === 'dark' ? 'vs-dark' : 'vs-light'}
                      language={language}
                      defaultValue="// Select a language from the icons..."
                      onChange={handleEditorChange}
                      options={{ 
                        minimap: { enabled: true },
                        validate: true
                      }}
                    />
                  </div>
                </Form.Group>
                
                {error && <Alert variant="danger">{error}</Alert>}

                <Button variant="primary" type="submit" disabled={isLoading} className="w-100 py-2">
                  <FaSave className="me-2" />
                  {isLoading ? 'Saving...' : 'Save & Share'}
                </Button>
              </Col>

            </Row>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default HomePage;