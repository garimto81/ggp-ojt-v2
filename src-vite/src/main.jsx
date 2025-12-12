// OJT Master v2.28.0 - Application Entry Point
// 버전 자동 업데이트 시스템 추가

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import {
  AuthProvider,
  DocsProvider,
  ToastProvider,
  AIProvider,
  VersionProvider,
} from './contexts';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ToastProvider>
      <VersionProvider>
        <AuthProvider>
          <AIProvider>
            <DocsProvider>
              <App />
            </DocsProvider>
          </AIProvider>
        </AuthProvider>
      </VersionProvider>
    </ToastProvider>
  </StrictMode>
);
