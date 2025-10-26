import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import { Container, Navbar, Form } from 'react-bootstrap';
import './App.css';
import { FaCode, FaSun, FaMoon } from 'react-icons/fa';
import { Toaster } from 'react-hot-toast';

// Import components
import HomePage from './components/HomePage';
import SnippetPage from './components/SnippetPage';
import Footer from './components/Footer';

function App() {
  const [theme, setTheme] = useState('dark');

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  useEffect(() => {
    document.body.className = '';
    document.body.classList.add(theme);
  }, [theme]);

  return (
    <Router>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        
        <Toaster 
          position="top-center"
          reverseOrder={false}
          toastOptions={{
            style: {
              background: theme === 'dark' ? '#333' : '#fff',
              color: theme === 'dark' ? '#fff' : '#333',
              border: theme === 'dark' ? '1px solid #555' : '1px solid #ddd',
            },
          }}
        />

        <Navbar variant={theme} expand="lg" className="mb-4">
          <Container>
            <Navbar.Brand as={Link} to="/">
              <FaCode className="me-2" /> CodeBin
            </Navbar.Brand>
            
            <Form className="d-flex align-items-center">
              <FaSun className="me-2" style={{ color: theme === 'light' ? '#f39c12' : '#888' }} />
              <Form.Check
                type="switch"
                id="theme-switch"
                checked={theme === 'dark'}
                onChange={toggleTheme}
              />
              <FaMoon className="ms-2" style={{ color: theme === 'dark' ? '#3498db' : '#888' }} />
            </Form>
          </Container>
        </Navbar>

        <main className="app-container" style={{ flex: 1 }}>
          <Routes>
            <Route path="/" element={<HomePage theme={theme} />} />
            <Route path="/snippet/:id" element={<SnippetPage theme={theme} />} />
          </Routes>
        </main>

        <Footer />
      </div>
    </Router>
  );
}

export default App;