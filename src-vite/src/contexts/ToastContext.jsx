// OJT Master v2.3.0 - Toast Context
/**
 * ROLE: Context API - UI State Management
 *
 * PURPOSE:
 * - 전역 Toast 알림 상태 관리
 * - react-hot-toast 라이브러리 래퍼
 * - 컴포넌트 외부에서도 Toast 사용 가능 (Toast 객체 export)
 *
 * RESPONSIBILITY:
 * ✅ Toast 알림 표시 (success, error, warning, info, loading)
 * ✅ Toast 설정 (position, duration, style)
 * ✅ Promise 상태 Toast (toast.promise)
 *
 * NOT RESPONSIBLE FOR:
 * ❌ 데이터 fetch → React Query 사용
 * ❌ 비즈니스 로직 → 서비스 레이어 사용
 *
 * WHY CONTEXT:
 * - Toast는 앱 전체에서 공유되는 UI 상태
 * - 서버 데이터와 무관한 순수 클라이언트 상태
 * - react-hot-toast는 자체적으로 상태 관리하므로 캐싱 불필요
 */

import { createContext, useContext } from 'react';
import toast, { Toaster } from 'react-hot-toast';

const ToastContext = createContext(null);

// Toast helper object for use outside of React components
export const Toast = {
  success(message) {
    toast.success(message, { duration: 3000 });
  },
  error(message) {
    toast.error(message, { duration: 5000 });
  },
  warning(message) {
    toast(message, { duration: 4000, icon: '⚠️' });
  },
  info(message) {
    toast(message, { duration: 3000, icon: 'ℹ️' });
  },
  loading(message) {
    return toast.loading(message);
  },
  dismiss(toastId) {
    if (toastId) toast.dismiss(toastId);
  },
  promise(promise, messages) {
    return toast.promise(promise, messages);
  },
};

export function ToastProvider({ children }) {
  return (
    <ToastContext.Provider value={Toast}>
      {children}
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: '#333',
            color: '#fff',
            maxWidth: '500px',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 5000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
