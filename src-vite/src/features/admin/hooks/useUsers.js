// OJT Master - React Query Hooks for Users (Issue #58)
/**
 * ROLE: React Query - Server State Management
 *
 * PURPOSE:
 * - Supabase 사용자 데이터 fetch, mutation, caching
 * - 관리자 기능: 역할 변경, 부서 변경, 활성화 토글, 삭제
 * - 서버 상태 관리 및 Optimistic updates
 *
 * RESPONSIBILITY:
 * ✅ 서버 데이터 CRUD (Supabase users 테이블)
 * ✅ 역할/부서 변경, 사용자 활성화 관리
 * ✅ 캐시 업데이트 및 무효화 (setQueryData, invalidateQueries)
 *
 * NOT RESPONSIBLE FOR:
 * ❌ 현재 로그인 사용자 상태 → AuthContext 사용
 * ❌ 세션 관리 및 인증 → AuthContext 사용
 * ❌ UI 상태 (필터, 정렬) → 컴포넌트 로컬 상태
 *
 * PATTERN: Query Keys Factory + Optimistic Updates
 * - usersKeys 객체로 쿼리 키 중앙 관리
 * - mutation onSuccess에서 setQueryData로 즉시 캐시 업데이트
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@utils/api';

// Query Keys
export const usersKeys = {
  all: ['users'],
  lists: () => [...usersKeys.all, 'list'],
  list: (filters) => [...usersKeys.lists(), filters],
  details: () => [...usersKeys.all, 'detail'],
  detail: (id) => [...usersKeys.details(), id],
};

/**
 * Fetch all users from Supabase
 *
 * SECURITY NOTE (Issue #78):
 * - Supabase RLS 정책으로 권한 검증 (database/migrations/supabase_schema.sql:91-99)
 * - Admin만 모든 사용자 조회 가능 ("Admins can view all users" 정책)
 * - 일반 사용자는 자신의 프로필만 조회 가능 ("Users can view own profile" 정책)
 * - 프론트엔드 권한 체크는 UX용, 실제 보안은 RLS에서 처리
 */
async function fetchUsers(filters = {}) {
  let query = supabase.from('users').select('*');

  if (filters.role) {
    query = query.eq('role', filters.role);
  }
  if (filters.department) {
    query = query.eq('department', filters.department);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Update user role
 *
 * SECURITY NOTE (Issue #78):
 * - Supabase RLS 정책 "Admins can update user roles" (schema.sql:96-99)으로 보호
 * - Admin 아닌 사용자가 호출 시 RLS가 자동으로 차단
 */
async function updateUserRole({ userId, newRole }) {
  const { data, error } = await supabase
    .from('users')
    .update({ role: newRole, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update user department
 *
 * SECURITY NOTE (Issue #78):
 * - Supabase RLS 정책 "Admins can update user roles" (schema.sql:96-99)으로 보호
 * - Admin 아닌 사용자가 호출 시 RLS가 자동으로 차단
 */
async function updateUserDepartment({ userId, newDepartment }) {
  const { data, error } = await supabase
    .from('users')
    .update({ department: newDepartment || null, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Toggle user active status
 *
 * SECURITY NOTE (Issue #78):
 * - Supabase RLS 정책 "Admins can update user roles" (schema.sql:96-99)으로 보호
 * - Admin 아닌 사용자가 호출 시 RLS가 자동으로 차단
 */
async function toggleUserActive({ userId, isActive }) {
  const { data, error } = await supabase
    .from('users')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete a user
 *
 * SECURITY NOTE (Issue #78):
 * - Supabase RLS 정책으로 보호 (Admin만 가능)
 * - 프론트엔드에서 2단계 확인 (AdminDashboard.jsx:198-207)
 *   1. window.confirm() 경고
 *   2. 사용자 이름 입력 확인 (CSRF-like protection)
 */
async function deleteUser(userId) {
  const { error } = await supabase.from('users').delete().eq('id', userId);

  if (error) throw error;
  return userId;
}

// ========== React Query Hooks ==========

/**
 * Fetch all users with optional filters
 */
export function useUsers(filters = {}) {
  return useQuery({
    queryKey: usersKeys.list(filters),
    queryFn: () => fetchUsers(filters),
  });
}

/**
 * Update user role
 */
export function useUpdateUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateUserRole,
    onSuccess: (updatedUser) => {
      // Update user in cache optimistically
      queryClient.setQueryData(usersKeys.detail(updatedUser.id), updatedUser);
      // Invalidate lists to refetch
      queryClient.invalidateQueries({ queryKey: usersKeys.lists() });
    },
  });
}

/**
 * Update user department
 */
export function useUpdateUserDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateUserDepartment,
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(usersKeys.detail(updatedUser.id), updatedUser);
      queryClient.invalidateQueries({ queryKey: usersKeys.lists() });
    },
  });
}

/**
 * Toggle user active status
 */
export function useToggleUserActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: toggleUserActive,
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(usersKeys.detail(updatedUser.id), updatedUser);
      queryClient.invalidateQueries({ queryKey: usersKeys.lists() });
    },
  });
}

/**
 * Delete a user
 */
export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteUser,
    onSuccess: (deletedId) => {
      queryClient.removeQueries({ queryKey: usersKeys.detail(deletedId) });
      queryClient.invalidateQueries({ queryKey: usersKeys.lists() });
    },
  });
}
