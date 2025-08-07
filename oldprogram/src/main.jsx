import React from 'react';
import ReactDOM from 'react-dom/client';
// Using HashRouter instead of BrowserRouter for Electron apps
// HashRouter uses the hash portion of the URL (#) which doesn't require server-side routing
// This solves blank window issues in production builds where file:// protocol is used
import { HashRouter } from 'react-router-dom';
import App from './App';
import './App.css';
// import { StreamingProvider } from './context/StreamingContext';

// Add error handling for root container
const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error('Failed to find the root element. Make sure there is a div with id="root" in your HTML file.');
} else {
  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <HashRouter>
          {/* <StreamingProvider> */}
            <App />
          {/* </StreamingProvider> */}
        </HashRouter>
      </React.StrictMode>
    );
    console.log('React app rendered successfully');
  } catch (error) {
    console.error('Failed to render React app:', error);
  }
}