import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// 1. Import Bootstrap's CSS
import 'bootstrap/dist/css/bootstrap.min.css';

// 2. Import your custom App.css
import './App.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);