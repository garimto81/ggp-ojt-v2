// OJT Master v2.33.0 - Application Entry Point
// #178: DepartmentsProvider 추가

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import {
  AuthProvider,
  DocsProvider,
  ToastProvider,
  AIProvider,
  VersionProvider,
  DepartmentsProvider,
} from './contexts';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ToastProvider>
      <VersionProvider>
        <AuthProvider>
          <DepartmentsProvider>
            <AIProvider>
              <DocsProvider>
                <App />
              </DocsProvider>
            </AIProvider>
          </DepartmentsProvider>
        </AuthProvider>
      </VersionProvider>
    </ToastProvider>
  </StrictMode>
);
