// OJT Master v2.14.0 - Admin Dashboard Component (Issue #54, #78, Admin Redesign)
// Issue #126: React Query로 CRUD 마이그레이션

import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useDocsContext } from '@contexts/DocsContext';
import { useDocsQuery, useDeleteDoc } from '@features/docs/hooks/useDocs';
import { useAuth } from '@features/auth/hooks/AuthContext';
import { Toast } from '@contexts/ToastContext';
import { supabase } from '@utils/api';
import { formatDate, sanitizeText } from '@utils/helpers';
import { useDebounce } from '@hooks/useDebounce';
import { ROLES } from '@/constants';
import { Spinner } from '@components/ui';
import {
  useMentorContribution,
  useLearningProgress,
  useQuizWeakness,
  useLearningActivity,
  useTeamStats,
} from '../hooks/useAnalytics';
import { useDepartments, getCombinedDepartments } from '../hooks/useDepartments';
import { ContentManagementTab } from './content';
import { SettingsTab } from './settings';
import { StatsTab } from './stats';
import UserApprovalTab from './UserApprovalTab';
const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50];

export default function AdminDashboard() {
  // React Query hooks for server data (Issue #126)
  const { data: allDocs = [], isLoading: docsLoading } = useDocsQuery();
  const deleteDocMutation = useDeleteDoc();
  const { clearDocState } = useDocsContext();

  const { user } = useAuth();
  const { departments: dbDepartments } = useDepartments();

  const [activeTab, setActiveTab] = useState('users');
  const [allUsers, setAllUsers] = useState([]);
  const [allRecords, setAllRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Users tab state
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [userDeptFilter, setUserDeptFilter] = useState('');
  const [userPage, setUserPage] = useState(1);
  const [userItemsPerPage, setUserItemsPerPage] = useState(20);
  const [userSort, setUserSort] = useState({ field: 'created_at', order: 'desc' });

  // Debounced search values
  const debouncedUserSearch = useDebounce(userSearch, 300);

  // Security: Verify admin role before loading data (Issue #78)
  const isAdmin = user?.role === ROLES.ADMIN;

  // Load admin data (Issue #120: 병렬 API 호출로 개선)
  useEffect(() => {
    const loadAdminData = async () => {
      // Security check: Only admins can access this data
      if (!isAdmin) {
        Toast.error('관리자 권한이 필요합니다.');
        return;
      }

      setIsLoading(true);
      try {
        // 병렬 API 호출로 초기 로딩 시간 단축
        const [usersResult, recordsResult] = await Promise.all([
          supabase.from('users').select('*').order('created_at', { ascending: false }),
          supabase.from('learning_records').select('*').order('completed_at', { ascending: false }),
        ]);

        if (!usersResult.error) setAllUsers(usersResult.data || []);
        if (!recordsResult.error) setAllRecords(recordsResult.data || []);

        // 에러 로깅 (하나라도 실패한 경우)
        if (usersResult.error || recordsResult.error) {
          console.error('Partial load error:', { usersResult, recordsResult });
        }
      } catch (e) {
        console.error('Admin data load error:', e);
        Toast.error('관리자 데이터를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    loadAdminData();
  }, [isAdmin]);

  // Reset page when filters change
  useEffect(() => {
    setUserPage(1);
  }, [debouncedUserSearch, userRoleFilter, userDeptFilter, userItemsPerPage]);

  // Change user role (Issue #78: Added confirmation, #128: useCallback)
  const handleRoleChange = useCallback(
    async (userId, newRole) => {
      // Security: Require admin role
      if (!isAdmin) {
        Toast.error('관리자 권한이 필요합니다.');
        return;
      }

      const targetUser = allUsers.find((u) => u.id === userId);
      if (
        !window.confirm(
          `${sanitizeText(targetUser?.name)}님의 역할을 ${newRole}(으)로 변경하시겠습니까?`
        )
      ) {
        return;
      }

      try {
        const { error } = await supabase
          .from('users')
          .update({ role: newRole, updated_at: new Date().toISOString() })
          .eq('id', userId);

        if (error) throw error;

        setAllUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
        Toast.success(`역할이 ${newRole}(으)로 변경되었습니다.`);
      } catch (e) {
        console.error('Role change error:', e);
        Toast.error('역할 변경에 실패했습니다: ' + e.message);
      }
    },
    [isAdmin, allUsers]
  );

  // Change user department (Issue #78: Added security check, #128: useCallback)
  const handleDepartmentChange = useCallback(
    async (userId, newDepartment) => {
      // Security: Require admin role
      if (!isAdmin) {
        Toast.error('관리자 권한이 필요합니다.');
        return;
      }

      try {
        const { error } = await supabase
          .from('users')
          .update({ department: newDepartment || null, updated_at: new Date().toISOString() })
          .eq('id', userId);

        if (error) throw error;

        setAllUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, department: newDepartment || null } : u))
        );
        Toast.success('부서가 변경되었습니다.');
      } catch (e) {
        console.error('Department change error:', e);
        Toast.error('부서 변경에 실패했습니다: ' + e.message);
      }
    },
    [isAdmin]
  );

  // Toggle user active status (Issue #78: Added security check, #128: useCallback)
  const handleToggleActive = useCallback(
    async (userId, currentStatus) => {
      // Security: Require admin role
      if (!isAdmin) {
        Toast.error('관리자 권한이 필요합니다.');
        return;
      }

      const newStatus = !currentStatus;
      const targetUser = allUsers.find((u) => u.id === userId);

      if (
        !window.confirm(
          `${sanitizeText(targetUser?.name)}님을 ${newStatus ? '활성화' : '정지'}하시겠습니까?`
        )
      ) {
        return;
      }

      try {
        const { error } = await supabase
          .from('users')
          .update({ is_active: newStatus, updated_at: new Date().toISOString() })
          .eq('id', userId);

        if (error) throw error;

        setAllUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, is_active: newStatus } : u))
        );
        Toast.success(`사용자가 ${newStatus ? '활성화' : '정지'}되었습니다.`);
      } catch (e) {
        console.error('Toggle active error:', e);
        Toast.error('상태 변경에 실패했습니다: ' + e.message);
      }
    },
    [isAdmin, allUsers]
  );

  // Delete user (Issue #78: Added 2-step CSRF-like confirmation, #128: useCallback)
  const handleDeleteUser = useCallback(
    async (userId) => {
      // Security: Require admin role
      if (!isAdmin) {
        Toast.error('관리자 권한이 필요합니다.');
        return;
      }

      const targetUser = allUsers.find((u) => u.id === userId);
      const userName = sanitizeText(targetUser?.name) || '사용자';

      // Step 1: First confirmation
      if (
        !window.confirm(`정말 ${userName}님을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)
      ) {
        return;
      }

      // Step 2: Name input confirmation (CSRF-like protection)
      const userInput = prompt(`삭제하려면 사용자 이름을 정확히 입력하세요:\n"${userName}"`);
      if (userInput !== userName) {
        Toast.warning('이름이 일치하지 않습니다. 삭제가 취소되었습니다.');
        return;
      }

      try {
        const { error } = await supabase.from('users').delete().eq('id', userId);

        if (error) throw error;

        setAllUsers((prev) => prev.filter((u) => u.id !== userId));
        Toast.success('사용자가 삭제되었습니다.');
      } catch (e) {
        console.error('Delete user error:', e);
        Toast.error('사용자 삭제에 실패했습니다: ' + e.message);
      }
    },
    [isAdmin, allUsers]
  );

  // 부서 목록 (DB 설정 + 기존 사용자 부서)
  const departmentOptions = useMemo(() => {
    return getCombinedDepartments(dbDepartments, allUsers);
  }, [dbDepartments, allUsers]);

  // Filtered and paginated users
  const { filteredUsers, paginatedUsers, totalUserPages } = useMemo(() => {
    let filtered = [...allUsers];

    // Search filter
    if (debouncedUserSearch) {
      const search = debouncedUserSearch.toLowerCase();
      filtered = filtered.filter((u) => u.name?.toLowerCase().includes(search));
    }

    // Role filter
    if (userRoleFilter) {
      filtered = filtered.filter((u) => u.role === userRoleFilter);
    }

    // Department filter
    if (userDeptFilter) {
      filtered = filtered.filter((u) => u.department === userDeptFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      const aVal = a[userSort.field] || '';
      const bVal = b[userSort.field] || '';
      const comparison = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      return userSort.order === 'asc' ? comparison : -comparison;
    });

    const totalPages = Math.ceil(filtered.length / userItemsPerPage);
    const startIndex = (userPage - 1) * userItemsPerPage;
    const paginated = filtered.slice(startIndex, startIndex + userItemsPerPage);

    return { filteredUsers: filtered, paginatedUsers: paginated, totalUserPages: totalPages };
  }, [
    allUsers,
    debouncedUserSearch,
    userRoleFilter,
    userDeptFilter,
    userSort,
    userPage,
    userItemsPerPage,
  ]);

  // Handle sort change (Issue #128: useCallback)
  const handleUserSort = useCallback((field) => {
    setUserSort((prev) => ({
      field,
      order: prev.field === field && prev.order === 'desc' ? 'asc' : 'desc',
    }));
  }, []);

  // Calculate stats
  const stats = {
    totalUsers: allUsers.length,
    totalDocs: allDocs.length,
    totalRecords: allRecords.length,
    passRate: allRecords.length
      ? Math.round((allRecords.filter((r) => r.passed).length / allRecords.length) * 100)
      : 0,
  };

  // Analytics hooks (Issue #54)
  const mentorContribution = useMentorContribution(allDocs);
  const { userProgress, overallStats } = useLearningProgress(allRecords, allUsers, allDocs);
  const quizWeakness = useQuizWeakness(allRecords, allDocs);
  const { last7Days } = useLearningActivity(allRecords);
  const teamStats = useTeamStats(allDocs, allRecords);

  if (isLoading || docsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="md" color="primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-500">총 사용자</p>
          <p className="text-2xl font-bold text-gray-800">{stats.totalUsers}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-500">총 문서</p>
          <p className="text-2xl font-bold text-gray-800">{stats.totalDocs}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-500">학습 기록</p>
          <p className="text-2xl font-bold text-gray-800">{stats.totalRecords}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-500">통과율</p>
          <p className="text-2xl font-bold text-green-600">{stats.passRate}%</p>
        </div>
      </div>

      {/* Tabs (Issue #77: Added a11y) */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="border-b flex" role="tablist" aria-label="관리자 대시보드 탭">
          {['users', 'approval', 'docs', 'stats', 'settings'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              role="tab"
              aria-selected={activeTab === tab}
              aria-controls={`tabpanel-${tab}`}
              id={`tab-${tab}`}
              className={`px-6 py-3 font-medium transition ${
                activeTab === tab
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'users' && '사용자 관리'}
              {tab === 'approval' && '승인 관리'}
              {tab === 'docs' && '콘텐츠 관리'}
              {tab === 'stats' && '통계'}
              {tab === 'settings' && '설정'}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* Users Tab */}
          {activeTab === 'users' && (
            <div role="tabpanel" id="tabpanel-users" aria-labelledby="tab-users">
              <div className="space-y-4">
                {/* Filters */}
                <div className="flex flex-wrap gap-3">
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="이름 검색..."
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <select
                    value={userRoleFilter}
                    onChange={(e) => setUserRoleFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">모든 역할</option>
                    <option value="admin">Admin</option>
                    <option value="mentor">Mentor</option>
                    <option value="mentee">Mentee</option>
                  </select>
                  <select
                    value={userDeptFilter}
                    onChange={(e) => setUserDeptFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">모든 부서</option>
                    {departmentOptions.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                  <select
                    value={userItemsPerPage}
                    onChange={(e) => setUserItemsPerPage(Number(e.target.value))}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {ITEMS_PER_PAGE_OPTIONS.map((n) => (
                      <option key={n} value={n}>
                        {n}개씩
                      </option>
                    ))}
                  </select>
                </div>

                {/* Results count */}
                <p className="text-sm text-gray-500">
                  {filteredUsers.length}명 중 {paginatedUsers.length}명 표시
                </p>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-sm text-gray-500 border-b">
                        <th
                          className="pb-3 font-medium cursor-pointer hover:text-gray-700"
                          onClick={() => handleUserSort('name')}
                        >
                          이름 {userSort.field === 'name' && (userSort.order === 'asc' ? '↑' : '↓')}
                        </th>
                        <th className="pb-3 font-medium">역할</th>
                        <th className="pb-3 font-medium">부서</th>
                        <th
                          className="pb-3 font-medium cursor-pointer hover:text-gray-700"
                          onClick={() => handleUserSort('created_at')}
                        >
                          가입일{' '}
                          {userSort.field === 'created_at' &&
                            (userSort.order === 'asc' ? '↑' : '↓')}
                        </th>
                        <th className="pb-3 font-medium">액션</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedUsers.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-gray-500">
                            검색 결과가 없습니다.
                          </td>
                        </tr>
                      ) : (
                        paginatedUsers.map((u) => (
                          <tr key={u.id} className="border-b last:border-0">
                            <td className="py-3">
                              {u.name}
                              {u.is_active === false && (
                                <span className="ml-2 text-xs text-red-500">(정지됨)</span>
                              )}
                            </td>
                            <td className="py-3">
                              <select
                                value={u.role || ''}
                                onChange={(e) => handleRoleChange(u.id, e.target.value)}
                                className="px-2 py-1 border rounded text-sm"
                                disabled={u.id === user?.id}
                              >
                                <option value="admin">Admin</option>
                                <option value="mentor">Mentor</option>
                                <option value="mentee">Mentee</option>
                              </select>
                            </td>
                            <td className="py-3">
                              <select
                                value={u.department || ''}
                                onChange={(e) => handleDepartmentChange(u.id, e.target.value)}
                                className="px-2 py-1 border rounded text-sm"
                              >
                                <option value="">선택 안함</option>
                                {departmentOptions.map((dept) => (
                                  <option key={dept} value={dept}>
                                    {dept}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="py-3 text-sm text-gray-500">
                              {formatDate(u.created_at)}
                            </td>
                            <td className="py-3">
                              {u.id === user?.id ? (
                                <span className="text-xs text-gray-400">(본인)</span>
                              ) : (
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleToggleActive(u.id, u.is_active !== false)}
                                    className={`text-xs px-2 py-1 rounded ${
                                      u.is_active === false
                                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                        : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                                    }`}
                                  >
                                    {u.is_active === false ? '활성화' : '정지'}
                                  </button>
                                  <button
                                    onClick={() => handleDeleteUser(u.id)}
                                    className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200"
                                  >
                                    삭제
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalUserPages > 1 && (
                  <Pagination
                    currentPage={userPage}
                    totalPages={totalUserPages}
                    onPageChange={setUserPage}
                  />
                )}
              </div>
            </div>
          )}

          {/* Approval Tab (Issue #105: Email 사용자 승인) */}
          {activeTab === 'approval' && (
            <div role="tabpanel" id="tabpanel-approval" aria-labelledby="tab-approval">
              <UserApprovalTab />
            </div>
          )}

          {/* Docs Tab - Split View Content Management */}
          {activeTab === 'docs' && (
            <div role="tabpanel" id="tabpanel-docs" aria-labelledby="tab-docs">
              <ContentManagementTab
                docs={allDocs}
                onDocDeleted={async (docId) => {
                  await deleteDocMutation.mutateAsync(docId);
                  clearDocState(docId);
                }}
                isAdmin={isAdmin}
              />
            </div>
          )}

          {/* Stats Tab (Issue #54, Phase 6: Export) */}
          {activeTab === 'stats' && (
            <StatsTab
              stats={stats}
              overallStats={overallStats}
              last7Days={last7Days}
              mentorContribution={mentorContribution}
              userProgress={userProgress}
              teamStats={teamStats}
              quizWeakness={quizWeakness}
              allRecords={allRecords}
              allUsers={allUsers}
              allDocs={allDocs}
            />
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && <SettingsTab />}
        </div>
      </div>
    </div>
  );
}

// Pagination Component (Issue #129: React.memo, #130: 인라인 함수 최적화)
const Pagination = memo(function Pagination({ currentPage, totalPages, onPageChange }) {
  // 페이지 번호 계산을 useMemo로 메모이제이션
  const pageNumbers = useMemo(() => {
    const pages = [];
    const showEllipsis = totalPages > 7;

    if (!showEllipsis) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) pages.push('...');
      if (totalPages > 1) pages.push(totalPages);
    }
    return pages;
  }, [currentPage, totalPages]);

  // 이전/다음 핸들러를 useCallback으로 메모이제이션
  const handlePrev = useCallback(() => onPageChange(currentPage - 1), [onPageChange, currentPage]);
  const handleNext = useCallback(() => onPageChange(currentPage + 1), [onPageChange, currentPage]);

  return (
    <nav className="flex items-center justify-center gap-1 mt-4" aria-label="페이지네이션">
      <button
        onClick={handlePrev}
        disabled={currentPage === 1}
        className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="이전 페이지"
      >
        이전
      </button>

      {pageNumbers.map((page, index) =>
        page === '...' ? (
          <span key={`ellipsis-${index}`} className="px-2 text-gray-400">
            ...
          </span>
        ) : (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`px-3 py-2 text-sm font-medium rounded-lg ${
              currentPage === page
                ? 'text-blue-600 bg-blue-50 border border-blue-300'
                : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-100'
            }`}
            aria-label={`${page}페이지로 이동`}
            aria-current={currentPage === page ? 'page' : undefined}
          >
            {page}
          </button>
        )
      )}

      <button
        onClick={handleNext}
        disabled={currentPage === totalPages}
        className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="다음 페이지"
      >
        다음
      </button>
    </nav>
  );
});
