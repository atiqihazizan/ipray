import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Suppress React DevTools warning
const originalWarn = console.warn;
console.warn = (...args) => {
  if (args[0] && typeof args[0] === 'string' && args[0].includes('Download the React DevTools')) {
    return; // Suppress React DevTools warning
  }
  originalWarn.apply(console, args);
};

// Suppress WebSocket errors yang muncul dari socket.io-client (normal dalam React StrictMode)
const originalError = console.error;
console.error = (...args) => {
  const errorMsg = args[0]?.toString() || '';
  if (errorMsg.includes('WebSocket is closed before the connection is established') ||
      errorMsg.includes('WebSocket connection to') && errorMsg.includes('failed')) {
    // Suppress WebSocket errors - ini normal dalam React StrictMode double-invoke
    return;
  }
  originalError.apply(console, args);
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
