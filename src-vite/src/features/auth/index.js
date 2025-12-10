/**
 * Auth Feature - 인증 관련 기능
 * @agent auth-agent
 * @blocks auth.session, auth.user
 *
 * ⚠️ IMPORTANT: Context는 src/contexts/에서 re-export
 * - 중복 Context 인스턴스 방지 (Issue #182)
 * - Single Source of Truth 패턴 적용
 */

// Hooks - src/contexts에서 re-export (SSOT 패턴)
export { useAuth, AuthProvider } from '@/contexts/AuthContext';

// Components (default export를 named export로 re-export)
export { default as RoleSelectionPage } from './components/RoleSelectionPage';
