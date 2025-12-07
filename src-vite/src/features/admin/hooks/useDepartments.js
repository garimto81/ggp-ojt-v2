// OJT Master - useDepartments Hook
// Issue #93: 부서 목록을 admin_settings에서 가져오도록 수정

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@utils/api';

// Fallback departments (DB 접근 실패 시 사용)
const FALLBACK_DEPARTMENTS = ['개발팀', '디자인팀', '기획팀', '마케팅팀', '운영팀', '인사팀'];

/**
 * Query key factory for departments
 */
export const departmentsKeys = {
  all: ['departments'],
  settings: () => [...departmentsKeys.all, 'settings'],
};

/**
 * Fetch departments from admin_settings table
 */
async function fetchDepartments() {
  console.log('[useDepartments] Fetching departments from admin_settings...');

  const { data, error } = await supabase
    .from('admin_settings')
    .select('value')
    .eq('key', 'default_departments')
    .single();

  if (error) {
    console.warn('[useDepartments] Failed to fetch from DB, using fallback:', error.message);
    return FALLBACK_DEPARTMENTS;
  }

  const result = Array.isArray(data?.value) ? data.value : FALLBACK_DEPARTMENTS;
  console.log('[useDepartments] Loaded departments:', result);
  return result;
}

/**
 * Custom hook to get departments from admin_settings
 * - Fetches from Supabase admin_settings table
 * - Falls back to hardcoded defaults if fetch fails
 * - Caches for 5 minutes (staleTime)
 *
 * @returns {Object} { departments, isLoading, error, refetch }
 */
export function useDepartments() {
  const {
    data: departments = FALLBACK_DEPARTMENTS,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: departmentsKeys.settings(),
    queryFn: fetchDepartments,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    retry: 1, // Only retry once
  });

  return {
    departments,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Combine DB departments with existing user departments
 * @param {string[]} dbDepartments - Departments from admin_settings
 * @param {Array} users - User list to extract existing departments from
 * @returns {string[]} Combined and sorted unique departments
 */
export function getCombinedDepartments(dbDepartments, users) {
  const existingDepts = users
    .map((u) => u.department)
    .filter((d) => d && !dbDepartments.includes(d));
  return [...new Set([...dbDepartments, ...existingDepts])].sort();
}
