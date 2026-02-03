
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import '/src/index.css';
import 'material-symbols/outlined.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
// Removed StrictMode to improve compatibility with external editor libraries
root.render(
    <App />
);
