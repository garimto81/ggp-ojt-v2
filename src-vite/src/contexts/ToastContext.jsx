// OJT Master v2.3.0 - Toast Context
// Design System: PRD-0014 톤앤매너 가이드라인

import { createContext, useContext } from 'react';

import toast, { Toaster } from 'react-hot-toast';

const ToastContext = createContext(null);

// Design Tokens (PRD-0014)
const DESIGN_TOKENS = {
  colors: {
    success: '#10B981', // Emerald-500 - 성공, 긍정
    error: '#F43F5E', // Rose-500 - 에러, 위험
    warning: '#F59E0B', // Amber-500 - 주의
    info: '#3B82F6', // Primary/Blue-500 - 정보
    neutral: {
      50: '#F9FAFB',
      800: '#1F2937',
      900: '#111827',
    },
  },
};

// Toast helper object for use outside of React components
export const Toast = {
  success(message) {
    toast.success(message, { duration: 3000 });
  },
  error(message) {
    toast.error(message, { duration: 5000 });
  },
  warning(message) {
    toast(message, {
      duration: 4000,
      icon: '⚠️',
      style: {
        background: DESIGN_TOKENS.colors.warning,
        color: DESIGN_TOKENS.colors.neutral[900],
      },
    });
  },
  info(message) {
    toast(message, {
      duration: 3000,
      icon: 'ℹ️',
      style: {
        background: DESIGN_TOKENS.colors.info,
        color: '#fff',
      },
    });
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
          // 기본 스타일 - 모던하고 따뜻한 느낌
          style: {
            background: DESIGN_TOKENS.colors.neutral[800],
            color: DESIGN_TOKENS.colors.neutral[50],
            maxWidth: '500px',
            padding: '12px 16px',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: 500,
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
          },
          success: {
            duration: 3000,
            style: {
              background: '#ECFDF5', // Success-50
              color: '#065F46', // Success-800
              border: `1px solid ${DESIGN_TOKENS.colors.success}`,
            },
            iconTheme: {
              primary: DESIGN_TOKENS.colors.success,
              secondary: '#fff',
            },
          },
          error: {
            duration: 5000,
            style: {
              background: '#FFF1F2', // Error-50
              color: '#9F1239', // Error-800
              border: `1px solid ${DESIGN_TOKENS.colors.error}`,
            },
            iconTheme: {
              primary: DESIGN_TOKENS.colors.error,
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
