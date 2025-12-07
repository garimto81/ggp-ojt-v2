// OJT Master - useUserProfile Hook
/**
 * ROLE: Custom Hook - User Profile Loading & Sync
 *
 * PURPOSE:
 * - AuthContext에서 분리된 프로필 로딩 로직
 * - Supabase → 로컬 캐시 동기화
 * - 오프라인 폴백 처리
 *
 * WHY SEPARATED:
 * - 단일 책임 원칙 (SRP): 프로필 로딩은 인증과 별개의 관심사
 * - 테스트 용이성: Hook 단위로 독립 테스트 가능
 * - 재사용성: 다른 컴포넌트에서도 프로필 로딩 로직 활용 가능
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@utils/api';
import { dbGetAll, dbSave } from '@utils/db';
import { SecureSession, getViewStateByRole } from '@utils/helpers';
import { VIEW_STATES, ROLES } from '@/constants';

/**
 * @typedef {Object} UserProfile
 * @property {string} id - 사용자 ID
 * @property {string} name - 이름
 * @property {string} email - 이메일
 * @property {string|null} role - 역할 (admin/mentor/mentee)
 * @property {string|null} department - 부서
 */

/**
 * @typedef {Object} UseUserProfileResult
 * @property {UserProfile|null} user - 사용자 프로필
 * @property {string} viewState - 현재 뷰 상태
 * @property {string|null} sessionMode - 관리자 세션 모드
 * @property {boolean} isLoading - 로딩 상태
 * @property {function} refreshProfile - 프로필 새로고침 함수
 */

/**
 * 사용자 프로필 로딩 및 동기화 Hook
 * @param {Object|null} session - Supabase 인증 세션
 * @returns {UseUserProfileResult}
 */
export function useUserProfile(session) {
  const [user, setUser] = useState(null);
  const [viewState, setViewState] = useState(VIEW_STATES.LOADING);
  const [sessionMode, setSessionMode] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Supabase에서 프로필 조회
   * @param {string} userId
   * @returns {Promise<Object|null>}
   */
  const fetchFromSupabase = async (userId) => {
    const { data, error } = await supabase.from('users').select('*').eq('id', userId).single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned (new user)
      console.error('[useUserProfile] Supabase fetch error:', error);
    }

    return data;
  };

  /**
   * 로컬 캐시에서 프로필 조회 (오프라인 폴백)
   * @param {string} userId
   * @returns {Promise<Object|null>}
   */
  const fetchFromLocalCache = async (userId) => {
    try {
      const localUsers = await dbGetAll('users');
      return localUsers.find((u) => u.id === userId) || null;
    } catch (error) {
      console.error('[useUserProfile] Local cache error:', error);
      return null;
    }
  };

  /**
   * 프로필을 로컬 캐시에 동기화
   * @param {Object} profile
   */
  const syncToLocalCache = async (profile) => {
    try {
      await dbSave('users', profile);
    } catch (error) {
      console.error('[useUserProfile] Sync to local cache error:', error);
    }
  };

  /**
   * 관리자 세션 모드 복원
   * @param {string} role
   * @returns {string|null}
   */
  const restoreSessionMode = (role) => {
    if (role !== ROLES.ADMIN) return null;

    const tempMode = SecureSession.get('ojt_sessionMode');
    if (tempMode) {
      setSessionMode(tempMode);
      return tempMode;
    }
    return null;
  };

  /**
   * 프로필 로딩 메인 로직
   */
  const loadProfile = useCallback(async () => {
    if (!session?.user) {
      setViewState(VIEW_STATES.ROLE_SELECT);
      setIsLoading(false);
      return;
    }

    const { id: userId, email, user_metadata } = session.user;

    try {
      // 1. Supabase에서 프로필 조회 (Source of Truth)
      let profile = await fetchFromSupabase(userId);

      // 2. Supabase 실패 시 로컬 캐시 폴백 (오프라인 모드)
      if (!profile) {
        profile = await fetchFromLocalCache(userId);
      } else {
        // 3. Supabase 데이터를 로컬 캐시에 동기화
        await syncToLocalCache(profile);
      }

      // 4. 프로필 상태 처리
      if (profile?.role) {
        // 유효한 프로필
        setUser({
          id: profile.id,
          name: profile.name || user_metadata?.full_name,
          email,
          role: profile.role,
          department: profile.department,
        });

        const tempMode = restoreSessionMode(profile.role);
        const newViewState = getViewStateByRole(profile.role, tempMode);
        setViewState(newViewState);
      } else if (profile && !profile.role) {
        // 손상된 캐시 (역할 없음)
        console.warn('[useUserProfile] Corrupted cache detected (no role)');
        setUser({
          id: userId,
          name: profile.name || user_metadata?.full_name,
          email,
          role: null,
        });
        setViewState(VIEW_STATES.ROLE_SELECT);
      } else {
        // 신규 사용자
        setUser({
          id: userId,
          name: user_metadata?.full_name,
          email,
          role: null,
        });
        setViewState(VIEW_STATES.ROLE_SELECT);
      }
    } catch (error) {
      console.error('[useUserProfile] Profile load error:', error);
      setViewState(VIEW_STATES.ROLE_SELECT);
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  // 세션 변경 시 프로필 재로드
  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  return {
    user,
    setUser,
    viewState,
    setViewState,
    sessionMode,
    setSessionMode,
    isLoading,
    setIsLoading,
    refreshProfile: loadProfile,
  };
}
