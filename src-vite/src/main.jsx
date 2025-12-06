// OJT Master v2.8.0 - Application Entry Point

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AuthProvider } from './features/auth/hooks/AuthContext';
import { AIProvider } from './features/ai/hooks/AIContext';
import { DocsProvider } from './contexts/DocsContext';
import { ToastProvider } from './contexts/ToastContext';
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
