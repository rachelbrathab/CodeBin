import React from 'react';
import { Container } from 'react-bootstrap';
import { FaGithub } from 'react-icons/fa'; // Example icon

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <Container>
        <p>
          &copy; {currentYear} CodeBin. All rights reserved.
        </p>
        <p>
          <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-muted">
            <FaGithub style={{ fontSize: '1.5rem' }} />
          </a>
        </p>
      </Container>
    </footer>
  );
};

export default Footer;