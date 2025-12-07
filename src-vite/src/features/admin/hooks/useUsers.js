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
