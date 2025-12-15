/**
 * DepartmentsContext - 부서 관리 Context (#178)
 *
 * 호환성 레이어:
 * - departments 테이블이 있으면 사용 (정규화된 구조)
 * - 없으면 admin_settings.default_departments 폴백 (레거시)
 *
 * @issue #178 - departments 독립 테이블 도입
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

import { supabase } from '@/utils/api';

// Context 생성
const DepartmentsContext = createContext(null);

// 기본 부서 목록 (최종 폴백)
const DEFAULT_DEPARTMENTS = [
  { id: 'dev', name: '개발팀', slug: 'development', color_theme: 'indigo', display_order: 1 },
  { id: 'design', name: '디자인팀', slug: 'design', color_theme: 'pink', display_order: 2 },
  { id: 'planning', name: '기획팀', slug: 'planning', color_theme: 'purple', display_order: 3 },
  { id: 'marketing', name: '마케팅팀', slug: 'marketing', color_theme: 'orange', display_order: 4 },
  { id: 'operations', name: '운영팀', slug: 'operations', color_theme: 'teal', display_order: 5 },
  { id: 'hr', name: '인사팀', slug: 'hr', color_theme: 'cyan', display_order: 6 },
];

// 색상 테마 매핑 (레거시 호환)
const COLOR_THEME_MAP = {
  개발팀: 'indigo',
  디자인팀: 'pink',
  기획팀: 'purple',
  마케팅팀: 'orange',
  운영팀: 'teal',
  인사팀: 'cyan',
};

/**
 * DepartmentsProvider
 */
export function DepartmentsProvider({ children }) {
  const [departments, setDepartments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [source, setSource] = useState(null); // 'table' | 'settings' | 'default'

  // 부서 목록 로드
  const loadDepartments = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. departments 테이블 시도
      const { data: tableData, error: tableError } = await supabase
        .from('departments')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (!tableError && tableData && tableData.length > 0) {
        setDepartments(tableData);
        setSource('table');
        return;
      }

      // 2. admin_settings 폴백
      const { data: settingsData, error: settingsError } = await supabase
        .from('admin_settings')
        .select('value')
        .eq('key', 'default_departments')
        .single();

      if (!settingsError && settingsData?.value) {
        // JSONB 배열을 객체 배열로 변환
        const deptNames = Array.isArray(settingsData.value) ? settingsData.value : [];
        const converted = deptNames.map((name, index) => ({
          id: `legacy-${index}`,
          name,
          slug: name.toLowerCase().replace(/[^a-z0-9]/g, ''),
          color_theme: COLOR_THEME_MAP[name] || 'gray',
          display_order: index + 1,
          is_active: true,
        }));
        setDepartments(converted);
        setSource('settings');
        return;
      }

      // 3. 기본값 사용
      setDepartments(DEFAULT_DEPARTMENTS);
      setSource('default');
    } catch (err) {
      console.error('[DepartmentsContext] Load error:', err);
      setError(err.message);
      setDepartments(DEFAULT_DEPARTMENTS);
      setSource('default');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 초기 로드
  useEffect(() => {
    loadDepartments();
  }, [loadDepartments]);

  // 부서명으로 부서 찾기
  const getDepartmentByName = useCallback(
    (name) => {
      return departments.find((d) => d.name === name) || null;
    },
    [departments]
  );

  // 부서 ID로 부서 찾기
  const getDepartmentById = useCallback(
    (id) => {
      return departments.find((d) => d.id === id) || null;
    },
    [departments]
  );

  // 부서명 목록 (드롭다운용)
  const departmentNames = departments.map((d) => d.name);

  // 부서 색상 테마 가져오기
  const getDepartmentTheme = useCallback(
    (nameOrId) => {
      const dept = departments.find((d) => d.name === nameOrId || d.id === nameOrId);
      return dept?.color_theme || 'gray';
    },
    [departments]
  );

  const value = {
    departments,
    departmentNames,
    isLoading,
    error,
    source, // 데이터 출처 ('table' | 'settings' | 'default')
    isUsingTable: source === 'table',
    reload: loadDepartments,
    getDepartmentByName,
    getDepartmentById,
    getDepartmentTheme,
  };

  return <DepartmentsContext.Provider value={value}>{children}</DepartmentsContext.Provider>;
}

/**
 * useDepartments Hook
 */
export function useDepartments() {
  const context = useContext(DepartmentsContext);
  if (!context) {
    throw new Error('useDepartments는 DepartmentsProvider 내부에서 사용해야 합니다.');
  }
  return context;
}

export default DepartmentsContext;
