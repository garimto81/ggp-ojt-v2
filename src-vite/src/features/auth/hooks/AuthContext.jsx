// OJT Master v2.11.1 - Authentication Context (Refactored)
/**
 * ROLE: Context API - Client State Management
 *
 * PURPOSE:
 * - 현재 로그인 사용자의 인증 상태 관리 (전역 클라이언트 상태)
 * - Supabase 인증 세션과 동기화
 * - 뷰 상태(viewState) 및 모드(sessionMode) 관리
 *
 * RESPONSIBILITY:
 * ✅ 로그인 사용자 프로필 (user, displayRole)
 * ✅ 뷰 상태 관리 (viewState: LOADING → ROLE_SELECT → DASHBOARD)
 * ✅ 관리자 모드 전환 (sessionMode: admin ↔ mentor)
 * ✅ 인증 액션 (로그인, 로그아웃, 역할 선택)
 * ✅ Supabase auth 이벤트 리스너 및 세션 동기화
 *
 * NOT RESPONSIBLE FOR:
 * ❌ 사용자 목록 조회 → useUsers (React Query) 사용
 * ❌ 사용자 CRUD → useUsers mutation 사용
 * ❌ 서버 데이터 캐싱 → React Query 사용
 *
 * REFACTORED (Issue #83):
 * - loadUserProfile 로직 → useUserProfile Hook으로 분리
 * - 단일 책임 원칙(SRP) 적용
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@utils/api';
import { dbSave } from '@utils/db';
import { SecureSession, getViewStateByRole } from '@utils/helpers';
import { VIEW_STATES, ROLES } from '@/constants';
import { useUserProfile } from './useUserProfile';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [sessionInitialized, setSessionInitialized] = useState(false);

  // useUserProfile Hook으로 프로필 로딩 로직 위임
  const { user, setUser, viewState, setViewState, sessionMode, setSessionMode, isLoading } =
    useUserProfile(sessionInitialized ? session : undefined);

  // Display role (considers session mode for admin)
  const displayRole = sessionMode || user?.role;

  // Initialize auth state (runs only on mount)
  useEffect(() => {
    let isMounted = true;

    // Safety timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      if (isMounted) {
        console.warn('[Auth] Session loading timeout - forcing role select view');
        setSessionInitialized(true);
        setSession(null);
      }
    }, 15000); // 15 second max loading time

    // Check current session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      if (isMounted) {
        setSession(currentSession);
        setSessionInitialized(true);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (isMounted) {
        setSession(newSession);
        setSessionInitialized(true);
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(loadingTimeout);
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intentionally empty - only run on mount

  // Google login
  const handleGoogleLogin = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (error) {
      console.error('[Auth] Google login error:', error);
      throw error;
    }
  }, []);

  // Logout
  const handleLogout = useCallback(async () => {
    SecureSession.remove('ojt_sessionMode');
    setSessionMode(null);
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setViewState(VIEW_STATES.ROLE_SELECT);
  }, [setSessionMode, setUser, setViewState]);

  // Select role (for new users)
  const handleRoleSelect = useCallback(
    async (selectedRole) => {
      if (!user) return;

      // Validate role
      const validRoles = [ROLES.ADMIN, ROLES.MENTOR, ROLES.MENTEE];
      if (!validRoles.includes(selectedRole)) {
        console.error('[Auth] Invalid role:', selectedRole);
        throw new Error('Invalid role selected');
      }

      try {
        const userData = {
          id: user.id,
          name: user.name,
          role: selectedRole,
          department: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        // Save to Supabase first (source of truth)
        const { error: supabaseError } = await supabase
          .from('users')
          .upsert(userData, { onConflict: 'id' });

        if (supabaseError) {
          console.error('[Auth] Supabase save error:', supabaseError);
          throw supabaseError;
        }

        // Then save to local cache
        await dbSave('users', userData);

        setUser((prev) => ({ ...prev, role: selectedRole }));
        setViewState(getViewStateByRole(selectedRole));
      } catch (error) {
        console.error('[Auth] Role save error:', error);
        throw error;
      }
    },
    [user, setUser, setViewState]
  );

  // Switch mode (for admin only)
  const handleModeSwitch = useCallback(
    (mode) => {
      if (user?.role !== ROLES.ADMIN) return;

      if (mode === 'mentor') {
        SecureSession.set('ojt_sessionMode', 'mentor');
        setSessionMode('mentor');
        setViewState(VIEW_STATES.MENTOR_DASHBOARD);
      } else {
        SecureSession.remove('ojt_sessionMode');
        setSessionMode(null);
        setViewState(VIEW_STATES.ADMIN_DASHBOARD);
      }
    },
    [user?.role, setSessionMode, setViewState]
  );

  const value = {
    user,
    viewState,
    setViewState,
    sessionMode,
    displayRole,
    isLoading,
    handleGoogleLogin,
    handleLogout,
    handleRoleSelect,
    handleModeSwitch,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
