// OJT Master v2.14.0 - Authentication Context (Local-Only Architecture)
/**
 * ROLE: Context API - Client State Management
 *
 * PURPOSE:
 * - 현재 로그인 사용자의 인증 상태 관리 (전역 클라이언트 상태)
 * - 이메일/비밀번호 인증만 지원 (Google OAuth 제거)
 * - 뷰 상태(viewState) 및 모드(sessionMode) 관리
 *
 * RESPONSIBILITY:
 * ✅ 로그인 사용자 프로필 (user, displayRole)
 * ✅ 뷰 상태 관리 (viewState: LOADING → ROLE_SELECT → DASHBOARD)
 * ✅ 관리자 모드 전환 (sessionMode: admin ↔ mentor)
 * ✅ 인증 액션 (로그인, 로그아웃, 역할 선택)
 * ✅ 인증 세션 동기화
 *
 * NOT RESPONSIBLE FOR:
 * ❌ 사용자 목록 조회 → useUsers (React Query) 사용
 * ❌ 사용자 CRUD → useUsers mutation 사용
 * ❌ 서버 데이터 캐싱 → React Query 사용
 *
 * REFACTORED (Issue #114):
 * - Google OAuth 완전 제거
 * - 이메일/비밀번호 인증만 유지
 * - Supabase Auth 의존성을 자체 인증 API로 전환 준비 (TODO 표시)
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@utils/api';
import { dbSave } from '@utils/db';
import { SecureSession, getViewStateByRole } from '@utils/helpers';
import { VIEW_STATES, ROLES, USER_STATUS } from '@/constants';
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
  // TODO(Issue #114): Supabase Auth → 자체 인증 API로 전환
  // 현재는 Supabase Auth 사용, 추후 JWT 기반 자체 인증으로 교체 예정
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

    // TODO(Issue #114): Supabase onAuthStateChange → 자체 세션 관리로 교체
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

    // TODO(Issue #114): getSession() → localStorage JWT 검증으로 교체
    // 2. getSession()은 onAuthStateChange가 INITIAL_SESSION을 발생시키도록 트리거
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

  // Email login - 이메일/비밀번호 인증 (Local-Only Architecture)
  const handleEmailLogin = useCallback(async (email, password) => {
    try {
      // TODO(Issue #114): Supabase Auth → 자체 JWT 인증 API로 교체
      // POST /api/auth/login { email, password }
      // Response: { token, user }
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;

      // 사용자 status 확인
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('status')
        .eq('id', data.user.id)
        .single();

      if (userError) {
        // 신규 사용자 - 아직 users 테이블에 없음
        console.log('[Auth] User not in users table yet, proceeding to role selection');
        return { user: data.user, needsRoleSelect: true };
      }

      // 승인 대기 중인 경우
      if (userData.status === USER_STATUS.PENDING) {
        console.log('[Auth] User pending approval');
        return { user: data.user, status: USER_STATUS.PENDING };
      }

      // 거부된 경우
      if (userData.status === USER_STATUS.REJECTED) {
        await supabase.auth.signOut();
        throw new Error('계정이 승인 거부되었습니다. 관리자에게 문의하세요.');
      }

      return { user: data.user, status: USER_STATUS.APPROVED };
    } catch (error) {
      console.error('[Auth] Email login error:', error);
      throw error;
    }
  }, []);

  // Email signup - 회원가입 (관리자 승인 필요)
  const handleEmailSignup = useCallback(async ({ name, email, password, role }) => {
    try {
      // TODO(Issue #114): Supabase Auth → 자체 JWT 인증 API로 교체
      // POST /api/auth/signup { name, email, password, role }
      // Response: { token, user }

      // 1. Auth 계정 생성
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name, role },
        },
      });
      if (error) throw error;

      // 2. users 테이블에 pending 상태로 생성
      const userData = {
        id: data.user.id,
        name,
        role,
        department: null,
        status: USER_STATUS.PENDING,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error: insertError } = await supabase.from('users').insert(userData);

      if (insertError) {
        console.error('[Auth] User insert error:', insertError);
        // Auth 계정 삭제 시도 (롤백)
        await supabase.auth.signOut();
        throw insertError;
      }

      // 3. 로컬 캐시에도 저장
      await dbSave('users', userData);

      console.log('[Auth] Email signup successful, pending approval');
      return { user: data.user, status: USER_STATUS.PENDING };
    } catch (error) {
      console.error('[Auth] Email signup error:', error);
      throw error;
    }
  }, []);

  // Logout
  const handleLogout = useCallback(async () => {
    SecureSession.remove('ojt_sessionMode');
    setSessionMode(null);

    // TODO(Issue #114): Supabase signOut → localStorage JWT 삭제로 교체
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
          status: USER_STATUS.APPROVED, // 역할 선택 시 즉시 승인 (이메일 인증만 사용)
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        // TODO(Issue #114): Supabase upsert → 자체 API로 교체
        // PUT /api/users/:id { role }
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
    handleEmailLogin, // 이메일/비밀번호 로그인
    handleEmailSignup, // 이메일/비밀번호 회원가입
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
