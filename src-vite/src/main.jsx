// OJT Master v2.17.0 - Application Entry Point

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AuthProvider, DocsProvider, ToastProvider, AIProvider } from './contexts';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ToastProvider>
      <AuthProvider>
        <AIProvider>
          <DocsProvider>
            <App />
          </DocsProvider>
        </AIProvider>
      </AuthProvider>
    </ToastProvider>
  </StrictMode>
);
