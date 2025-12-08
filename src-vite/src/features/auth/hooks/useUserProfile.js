// OJT Master v2.14.0 - useUserProfile Hook (Local-Only Architecture)
/**
 * ROLE: Custom Hook - User Profile Loading & Sync
 *
 * PURPOSE:
 * - AuthContext에서 분리된 프로필 로딩 로직
 * - 데이터베이스 → 로컬 캐시 동기화
 * - 오프라인 폴백 처리
 *
 * WHY SEPARATED:
 * - 단일 책임 원칙 (SRP): 프로필 로딩은 인증과 별개의 관심사
 * - 테스트 용이성: Hook 단위로 독립 테스트 가능
 * - 재사용성: 다른 컴포넌트에서도 프로필 로딩 로직 활용 가능
 *
 * REFACTORED (Issue #114):
 * - auth_provider 체크 제거 (이메일 인증만 사용)
 * - Supabase 의존성을 자체 API로 전환 준비 (TODO 표시)
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@utils/api';
import { dbGetAll, dbSave } from '@utils/db';
import { SecureSession, getViewStateByRole } from '@utils/helpers';
import { VIEW_STATES, ROLES, USER_STATUS } from '@/constants';

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
   * 데이터베이스에서 프로필 조회
   * TODO(Issue #114): Supabase → 자체 API로 교체
   * GET /api/users/:id
   * @param {string} userId
   * @returns {Promise<Object|null>}
   */
  const fetchFromSupabase = async (userId) => {
    const { data, error } = await supabase.from('users').select('*').eq('id', userId).single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned (new user)
      console.error('[useUserProfile] Database fetch error:', error);
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
   *
   * session 상태:
   * - undefined: 초기화 중 → LOADING 유지
   * - null: 로그아웃 상태 → ROLE_SELECT로 전환
   * - object: 로그인 상태 → 프로필 로딩
   */
  const loadProfile = useCallback(async () => {
    console.log(
      '[useUserProfile] loadProfile 호출, session:',
      session === undefined ? 'undefined' : session === null ? 'null' : '세션 객체'
    );

    // undefined = 아직 세션 확인 중 (초기화 중) → LOADING 상태 유지
    if (session === undefined) {
      console.log('[useUserProfile] session === undefined, LOADING 유지');
      return;
    }

    // null = 세션 없음 (로그아웃 상태) → ROLE_SELECT로 전환
    if (session === null || !session?.user) {
      console.log('[useUserProfile] session === null 또는 user 없음, ROLE_SELECT로 전환');
      setViewState(VIEW_STATES.ROLE_SELECT);
      setIsLoading(false);
      return;
    }

    console.log('[useUserProfile] 유효한 세션, 프로필 로딩 시작. userId:', session.user.id);

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
        console.log('[useUserProfile] 유효한 프로필 발견, role:', profile.role);
        setUser({
          id: profile.id,
          name: profile.name || user_metadata?.full_name,
          email,
          role: profile.role,
          department: profile.department,
          status: profile.status,
        });

        // 사용자 status 체크 (이메일 인증만 사용)
        if (profile.status === USER_STATUS.PENDING) {
          console.log('[useUserProfile] User pending approval');
          setViewState(VIEW_STATES.PENDING_APPROVAL);
          return;
        }
        if (profile.status === USER_STATUS.REJECTED) {
          console.log('[useUserProfile] User rejected');
          setViewState(VIEW_STATES.ROLE_SELECT);
          return;
        }

        const tempMode = restoreSessionMode(profile.role);
        const newViewState = getViewStateByRole(profile.role, tempMode);
        console.log('[useUserProfile] viewState 설정:', newViewState);
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
        console.log('[useUserProfile] 프로필 없음 - 신규 사용자로 처리');
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
      console.log('[useUserProfile] loadProfile 완료, isLoading: false');
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
