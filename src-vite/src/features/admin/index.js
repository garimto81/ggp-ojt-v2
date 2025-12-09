/**
 * Admin Feature - 관리자 기능
 * @agent admin-agent
 * @blocks admin.dashboard, admin.users, admin.settings
 */

// Components (default export를 named export로 re-export)
export { default as AdminDashboard } from './components/AdminDashboard';

// Hooks (리팩토링 후 추가)
// export { useAnalytics } from './hooks/useAnalytics';
// export { useUsers } from './hooks/useUsers';

// Services (리팩토링 후 추가)
// export { analyticsService } from './services/analyticsService';
