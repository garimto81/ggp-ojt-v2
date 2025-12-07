// OJT Master v2.3.0 - Authentication Context
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
 * WHY CONTEXT:
 * - 인증 상태는 앱 전체에서 공유되는 클라이언트 상태
 * - Supabase auth 이벤트를 실시간 리스닝해야 함
 * - 서버 데이터가 아닌 "현재 세션" 상태이므로 캐싱 불필요
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@utils/api';
import { dbGetAll, dbSave } from '@utils/db';
import { SecureSession, getViewStateByRole } from '@utils/helpers';
import { VIEW_STATES, ROLES } from '@/constants';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [viewState, setViewState] = useState(VIEW_STATES.LOADING);
  const [sessionMode, setSessionMode] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Display role (considers session mode for admin)
  const displayRole = sessionMode || user?.role;

  // Load user profile
  const loadUserProfile = useCallback(async (session) => {
    console.log('[Auth] loadUserProfile called, session:', session ? 'exists' : 'null');
    if (!session?.user) {
      console.log('[Auth] No session user, setting ROLE_SELECT');
      setViewState(VIEW_STATES.ROLE_SELECT);
      setIsLoading(false);
      return;
    }
    console.log('[Auth] Session user id:', session.user.id, 'email:', session.user.email);

    try {
      // Always fetch from Supabase first (source of truth for role)
      console.log('[Auth] Fetching profile from Supabase...');
      const { data: supabaseProfile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows returned (new user)
        console.error('[Auth] Supabase fetch error:', error);
      }
      console.log(
        '[Auth] Profile from Supabase:',
        supabaseProfile ? { role: supabaseProfile.role, id: supabaseProfile.id } : 'not found'
      );

      let profile = supabaseProfile;

      // Fallback to local cache only if Supabase fails (offline mode)
      if (!profile) {
        console.log('[Auth] Supabase returned null, checking local cache...');
        const localUsers = await dbGetAll('users');
        console.log('[Auth] Local users count:', localUsers.length);
        profile = localUsers.find((u) => u.id === session.user.id);
        console.log(
          '[Auth] Profile from local cache:',
          profile ? { role: profile.role, id: profile.id } : 'not found'
        );
      } else {
        // Sync Supabase data to local cache
        console.log('[Auth] Syncing Supabase profile to local cache...');
        await dbSave('users', supabaseProfile);
      }

      if (profile && profile.role) {
        // Valid profile with role
        console.log('[Auth] Profile loaded:', { role: profile.role, id: profile.id });

        setUser({
          id: profile.id,
          name: profile.name || session.user.user_metadata?.full_name,
          email: session.user.email,
          role: profile.role,
          department: profile.department,
        });

        // Restore session mode if admin
        const tempMode = SecureSession.get('ojt_sessionMode');
        console.log(
          '[Auth] SessionMode from storage:',
          tempMode,
          ', user role:',
          profile.role,
          ', ROLES.ADMIN:',
          ROLES.ADMIN
        );
        console.log(
          '[Auth] Role comparison (profile.role === ROLES.ADMIN):',
          profile.role === ROLES.ADMIN
        );
        if (profile.role === ROLES.ADMIN && tempMode) {
          console.log('[Auth] Admin with tempMode, setting sessionMode:', tempMode);
          setSessionMode(tempMode);
        }

        const newViewState = getViewStateByRole(profile.role, tempMode);
        console.log('[Auth] getViewStateByRole result:', newViewState);
        console.log(
          '[Auth] Setting viewState:',
          newViewState,
          '(role:',
          profile.role,
          ', tempMode:',
          tempMode,
          ')'
        );
        setViewState(newViewState);
      } else if (profile && !profile.role) {
        // Corrupted cache: profile exists but no role - treat as new user
        console.warn('Corrupted user cache detected (no role), clearing...');
        setUser({
          id: session.user.id,
          name: profile.name || session.user.user_metadata?.full_name,
          email: session.user.email,
          role: null,
        });
        setViewState(VIEW_STATES.ROLE_SELECT);
      } else {
        // New user - needs role selection
        setUser({
          id: session.user.id,
          name: session.user.user_metadata?.full_name,
          email: session.user.email,
          role: null,
        });
        setViewState(VIEW_STATES.ROLE_SELECT);
      }
    } catch (error) {
      console.error('Profile load error:', error);
      setViewState(VIEW_STATES.ROLE_SELECT);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initialize auth state
  useEffect(() => {
    let loadingTimeout;
    let isMounted = true;

    // Safety timeout to prevent infinite loading (uses functional update to avoid stale closure)
    loadingTimeout = setTimeout(() => {
      setIsLoading((prev) => {
        if (prev && isMounted) {
          console.warn('Auth loading timeout - forcing role select view');
          setViewState(VIEW_STATES.ROLE_SELECT);
          return false;
        }
        return prev;
      });
    }, 15000); // 15 second max loading time

    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (isMounted) {
        loadUserProfile(session);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) {
        loadUserProfile(session);
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(loadingTimeout);
      subscription.unsubscribe();
    };
  }, [loadUserProfile]); // ← isLoading 제거 (순환 실행 방지)

  // Google login
  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (error) {
      console.error('Google login error:', error);
      throw error;
    }
  };

  // Logout
  const handleLogout = async () => {
    SecureSession.remove('ojt_sessionMode');
    setSessionMode(null);
    await supabase.auth.signOut();
    setUser(null);
    setViewState(VIEW_STATES.ROLE_SELECT);
  };

  // Select role (for new users)
  const handleRoleSelect = async (selectedRole) => {
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
      console.log('[Auth] Saving role to Supabase:', selectedRole);
      const { error: supabaseError } = await supabase
        .from('users')
        .upsert(userData, { onConflict: 'id' });

      if (supabaseError) {
        console.error('[Auth] Supabase save error:', supabaseError);
        throw supabaseError;
      }

      // Then save to local cache
      await dbSave('users', userData);
      console.log('[Auth] Role saved successfully to both Supabase and local cache');

      setUser((prev) => ({ ...prev, role: selectedRole }));
      setViewState(getViewStateByRole(selectedRole));
    } catch (error) {
      console.error('Role save error:', error);
      throw error;
    }
  };

  // Switch mode (for admin only)
  const handleModeSwitch = (mode) => {
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
  };

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
