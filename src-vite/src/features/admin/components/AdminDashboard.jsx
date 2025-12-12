// OJT Master v2.10.0 - Admin Dashboard Component (Issue #54, #78, Admin Redesign)

import { useState, useEffect, useMemo } from 'react';
import { useDocs } from '@/contexts/DocsContext';
import { useAuth } from '@/contexts/AuthContext';
import { Toast } from '@/contexts/ToastContext';
import { supabase } from '@/utils/api';
import { formatDate, sanitizeText } from '@/utils/helpers';
import { useDebounce } from '@/hooks/useDebounce';
import { ROLES } from '@/constants';
import {
  useMentorContribution,
  useLearningProgress,
  useQuizWeakness,
  useLearningActivity,
  useTeamStats,
} from '../hooks/useAnalytics';
import { ContentManagementTab } from './content';
import { SettingsTab } from './settings';
import { StatsTab } from './stats';
import {
  StatsCard,
  StatsCardGrid,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Input,
  Select,
  SelectOption,
  Badge,
  Button,
} from '@/components/ui';

// 기본 부서 목록
const DEFAULT_DEPARTMENTS = ['개발팀', '디자인팀', '기획팀', '마케팅팀', '운영팀', '인사팀'];
const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50];

export default function AdminDashboard() {
  const { allDocs, deleteDocument, isLoading: docsLoading } = useDocs();
  const { user } = useAuth();

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

  // Load admin data
  useEffect(() => {
    const loadAdminData = async () => {
      // Security check: Only admins can access this data
      if (!isAdmin) {
        Toast.error('관리자 권한이 필요합니다.');
        return;
      }

      setIsLoading(true);
      try {
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('*')
          .order('created_at', { ascending: false });

        if (!usersError) setAllUsers(users || []);

        const { data: records, error: recordsError } = await supabase
          .from('learning_records')
          .select('*')
          .order('completed_at', { ascending: false });

        if (!recordsError) setAllRecords(records || []);
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

  // Change user role (Issue #78: Added confirmation)
  const handleRoleChange = async (userId, newRole) => {
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
  };

  // Change user department (Issue #78: Added security check)
  const handleDepartmentChange = async (userId, newDepartment) => {
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
  };

  // Toggle user active status (Issue #78: Added security check)
  const handleToggleActive = async (userId, currentStatus) => {
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
  };

  // Delete user (Issue #78: Added 2-step CSRF-like confirmation)
  const handleDeleteUser = async (userId) => {
    // Security: Require admin role
    if (!isAdmin) {
      Toast.error('관리자 권한이 필요합니다.');
      return;
    }

    const targetUser = allUsers.find((u) => u.id === userId);
    const userName = sanitizeText(targetUser?.name) || '사용자';

    // Step 1: First confirmation
    if (!window.confirm(`정말 ${userName}님을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) {
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
  };

  // 부서 목록 (기본 + 기존 사용자 부서)
  const departmentOptions = useMemo(() => {
    const existingDepts = allUsers
      .map((u) => u.department)
      .filter((d) => d && !DEFAULT_DEPARTMENTS.includes(d));
    return [...new Set([...DEFAULT_DEPARTMENTS, ...existingDepts])].sort();
  }, [allUsers]);

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

  // Handle sort change
  const handleUserSort = (field) => {
    setUserSort((prev) => ({
      field,
      order: prev.field === field && prev.order === 'desc' ? 'asc' : 'desc',
    }));
  };

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
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards (PRD-0015 shadcn/ui) */}
      <StatsCardGrid columns={4}>
        <StatsCard icon="👥" label="총 사용자" value={stats.totalUsers} />
        <StatsCard icon="📄" label="총 문서" value={stats.totalDocs} />
        <StatsCard icon="📚" label="학습 기록" value={stats.totalRecords.toLocaleString()} />
        <StatsCard icon="✅" label="통과율" value={`${stats.passRate}%`} variant="success" />
      </StatsCardGrid>

      {/* Tabs (Issue #77: Added a11y) */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="border-b flex" role="tablist" aria-label="관리자 대시보드 탭">
          {['users', 'docs', 'stats', 'settings'].map((tab) => (
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
                {/* Filters (PRD-0015 shadcn/ui) */}
                <div className="flex flex-wrap gap-3">
                  <Input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="이름 검색..."
                    className="w-48"
                  />
                  <Select
                    value={userRoleFilter}
                    onChange={(e) => setUserRoleFilter(e.target.value)}
                    className="w-32"
                  >
                    <SelectOption value="">모든 역할</SelectOption>
                    <SelectOption value="admin">Admin</SelectOption>
                    <SelectOption value="mentor">Mentor</SelectOption>
                    <SelectOption value="mentee">Mentee</SelectOption>
                  </Select>
                  <Select
                    value={userDeptFilter}
                    onChange={(e) => setUserDeptFilter(e.target.value)}
                    className="w-32"
                  >
                    <SelectOption value="">모든 부서</SelectOption>
                    {departmentOptions.map((dept) => (
                      <SelectOption key={dept} value={dept}>
                        {dept}
                      </SelectOption>
                    ))}
                  </Select>
                  <Select
                    value={userItemsPerPage}
                    onChange={(e) => setUserItemsPerPage(Number(e.target.value))}
                    className="w-24"
                  >
                    {ITEMS_PER_PAGE_OPTIONS.map((n) => (
                      <SelectOption key={n} value={n}>
                        {n}개씩
                      </SelectOption>
                    ))}
                  </Select>
                </div>

                {/* Results count */}
                <p className="text-sm text-gray-500">
                  {filteredUsers.length}명 중 {paginatedUsers.length}명 표시
                </p>

                {/* Table (PRD-0015 shadcn/ui) */}
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead
                          className="cursor-pointer hover:text-gray-700"
                          onClick={() => handleUserSort('name')}
                        >
                          이름 {userSort.field === 'name' && (userSort.order === 'asc' ? '↑' : '↓')}
                        </TableHead>
                        <TableHead>역할</TableHead>
                        <TableHead>부서</TableHead>
                        <TableHead
                          className="cursor-pointer hover:text-gray-700"
                          onClick={() => handleUserSort('created_at')}
                        >
                          가입일{' '}
                          {userSort.field === 'created_at' &&
                            (userSort.order === 'asc' ? '↑' : '↓')}
                        </TableHead>
                        <TableHead>액션</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedUsers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="h-24 text-center text-gray-500">
                            검색 결과가 없습니다.
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedUsers.map((u) => (
                          <TableRow key={u.id}>
                            <TableCell className="font-medium">
                              {u.name}
                              {u.is_active === false && (
                                <Badge variant="error" className="ml-2">
                                  정지됨
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <Select
                                value={u.role || ''}
                                onChange={(e) => handleRoleChange(u.id, e.target.value)}
                                className="w-28"
                                disabled={u.id === user?.id}
                              >
                                <SelectOption value="admin">Admin</SelectOption>
                                <SelectOption value="mentor">Mentor</SelectOption>
                                <SelectOption value="mentee">Mentee</SelectOption>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Select
                                value={u.department || ''}
                                onChange={(e) => handleDepartmentChange(u.id, e.target.value)}
                                className="w-28"
                              >
                                <SelectOption value="">선택 안함</SelectOption>
                                {departmentOptions.map((dept) => (
                                  <SelectOption key={dept} value={dept}>
                                    {dept}
                                  </SelectOption>
                                ))}
                              </Select>
                            </TableCell>
                            <TableCell className="text-gray-500">
                              {formatDate(u.created_at)}
                            </TableCell>
                            <TableCell>
                              {u.id === user?.id ? (
                                <span className="text-xs text-gray-400">(본인)</span>
                              ) : (
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant={u.is_active === false ? 'success' : 'warning'}
                                    onClick={() => handleToggleActive(u.id, u.is_active !== false)}
                                  >
                                    {u.is_active === false ? '활성화' : '정지'}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleDeleteUser(u.id)}
                                  >
                                    삭제
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
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

          {/* Docs Tab - Split View Content Management */}
          {activeTab === 'docs' && (
            <div role="tabpanel" id="tabpanel-docs" aria-labelledby="tab-docs">
              <ContentManagementTab
                docs={allDocs}
                onDocDeleted={deleteDocument}
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

// Pagination Component
function Pagination({ currentPage, totalPages, onPageChange }) {
  const getPageNumbers = () => {
    const pages = [];
    const showEllipsis = totalPages > 7;

    if (!showEllipsis) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage > 3) {
        pages.push('...');
      }

      // Pages around current
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push('...');
      }

      // Always show last page
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }

    return pages;
  };

  return (
    <nav className="flex items-center justify-center gap-1 mt-4" aria-label="페이지네이션">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="이전 페이지"
      >
        이전
      </button>

      {getPageNumbers().map((page, index) =>
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
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="다음 페이지"
      >
        다음
      </button>
    </nav>
  );
}
