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
  // undefined: 초기화 전, null: 로그아웃, object: 로그인
  const [session, setSession] = useState(undefined);
  const [sessionInitialized, setSessionInitialized] = useState(false);

  // useUserProfile Hook으로 프로필 로딩 로직 위임
  // sessionInitialized가 false면 undefined 전달 (초기화 중)
  // sessionInitialized가 true면 실제 session 값 전달 (null 또는 세션 객체)
  const { user, setUser, viewState, setViewState, sessionMode, setSessionMode, isLoading } =
    useUserProfile(sessionInitialized ? session : undefined);

  // Display role (considers session mode for admin)
  const displayRole = sessionMode || user?.role;

  // Initialize auth state (runs only on mount)
  // Supabase 권장 패턴: onAuthStateChange를 먼저 등록 후 getSession() 호출
  // https://supabase.com/docs/reference/javascript/auth-onauthstatechange
  useEffect(() => {
    let isMounted = true;
    let initialSessionHandled = false; // 초기 세션 처리 완료 플래그

    console.log('[Auth] useEffect 시작 - 세션 초기화');

    // Safety timeout to prevent infinite loading (네트워크 실패 시)
    const loadingTimeout = setTimeout(() => {
      if (isMounted && !initialSessionHandled) {
        console.warn('[Auth] Session loading timeout (15s) - 세션 확인 미완료, 로컬 캐시 폴백');
        initialSessionHandled = true;
        // 타임아웃 시에도 session은 undefined로 유지하지 않음 - null로 설정하여 처리 진행
        setSession(null);
        setSessionInitialized(true);
      }
    }, 15000);

    // 1. 먼저 onAuthStateChange 리스너 등록
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      console.log('[Auth] onAuthStateChange:', event, newSession ? '세션 있음' : '세션 없음');

      if (!isMounted) return;

      // INITIAL_SESSION 이벤트가 초기 세션을 제공 (getSession 대신)
      if (event === 'INITIAL_SESSION') {
        console.log('[Auth] INITIAL_SESSION 처리');
        initialSessionHandled = true;
        clearTimeout(loadingTimeout);
      }

      setSession(newSession);
      setSessionInitialized(true);
    });

    // 2. getSession()은 onAuthStateChange가 INITIAL_SESSION을 발생시키도록 트리거
    // Supabase v2에서는 getSession() 호출 시 onAuthStateChange(INITIAL_SESSION)가 발생함
    console.log('[Auth] getSession() 호출 - INITIAL_SESSION 트리거');
    supabase.auth.getSession().catch((error) => {
      console.error('[Auth] getSession() 에러:', error);
      if (isMounted && !initialSessionHandled) {
        initialSessionHandled = true;
        clearTimeout(loadingTimeout);
        setSession(null);
        setSessionInitialized(true);
      }
    });

    return () => {
      console.log('[Auth] useEffect cleanup');
      isMounted = false;
      clearTimeout(loadingTimeout);
      subscription.unsubscribe();
    };
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
