// OJT Master v2.10.0 - Application Entry Point

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import App from '@/App';
import { AuthProvider } from '@features/auth/hooks/AuthContext';
import { AIProvider } from '@features/ai/hooks/AIContext';
import { DocsProvider } from '@contexts/DocsContext';
import { ToastProvider } from '@contexts/ToastContext';
import '@/index.css';

// React Query Client 설정
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5분 캐싱
      gcTime: 10 * 60 * 1000, // 10분 가비지 컬렉션
      retry: 1, // 1회 재시도
      refetchOnWindowFocus: false, // 탭 전환 시 자동 리페치 비활성화
    },
  },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <AIProvider>
            <DocsProvider>
              <App />
            </DocsProvider>
          </AIProvider>
        </AuthProvider>
      </ToastProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </StrictMode>
);
