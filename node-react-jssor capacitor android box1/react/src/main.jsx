import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import {
  KIOSK_DESIGN_HEIGHT,
  KIOSK_DESIGN_WIDTH,
  KIOSK_UI_SCALE,
} from './utils/screenUtils.js'

function ScaledRoot({ children }) {
  const halfW = KIOSK_DESIGN_WIDTH / 2
  const halfH = KIOSK_DESIGN_HEIGHT / 2
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        overflow: 'hidden',
        background: '#000',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: KIOSK_DESIGN_WIDTH,
          height: KIOSK_DESIGN_HEIGHT,
          marginLeft: -halfW,
          marginTop: -halfH,
          transform: `scale(${KIOSK_UI_SCALE})`,
          transformOrigin: 'center center',
        }}
      >
        {children}
      </div>
    </div>
  )
}

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
    <ScaledRoot>
      <App />
    </ScaledRoot>
  </StrictMode>,
)
