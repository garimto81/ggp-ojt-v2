// OJT Master v2.9.4 - Admin Dashboard Component

import { useState, useEffect, useMemo } from 'react';
import { useDocs } from '../contexts/DocsContext';
import { useAuth } from '../contexts/AuthContext';
import { Toast } from '../contexts/ToastContext';
import { supabase } from '../utils/api';
import { confirmDeleteWithCSRF, formatDate } from '../utils/helpers';
import { useDebounce } from '../hooks/useDebounce';

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

  // Docs tab state
  const [docSearch, setDocSearch] = useState('');
  const [docTeamFilter, setDocTeamFilter] = useState('');
  const [docAuthorFilter, setDocAuthorFilter] = useState('');
  const [docPage, setDocPage] = useState(1);
  const [docItemsPerPage, setDocItemsPerPage] = useState(20);

  // Debounced search values
  const debouncedUserSearch = useDebounce(userSearch, 300);
  const debouncedDocSearch = useDebounce(docSearch, 300);

  // Load admin data
  useEffect(() => {
    const loadAdminData = async () => {
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
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setUserPage(1);
  }, [debouncedUserSearch, userRoleFilter, userDeptFilter, userItemsPerPage]);

  useEffect(() => {
    setDocPage(1);
  }, [debouncedDocSearch, docTeamFilter, docAuthorFilter, docItemsPerPage]);

  // Change user role
  const handleRoleChange = async (userId, newRole) => {
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

  // Change user department
  const handleDepartmentChange = async (userId, newDepartment) => {
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

  // Toggle user active status
  const handleToggleActive = async (userId, currentStatus) => {
    const newStatus = !currentStatus;
    const targetUser = allUsers.find((u) => u.id === userId);

    if (!window.confirm(`${targetUser?.name}님을 ${newStatus ? '활성화' : '정지'}하시겠습니까?`)) {
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

  // Delete user
  const handleDeleteUser = async (userId) => {
    const targetUser = allUsers.find((u) => u.id === userId);

    if (
      !window.confirm(`정말 ${targetUser?.name}님을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)
    ) {
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

  // 팀 목록 (문서에서 추출)
  const teamOptions = useMemo(() => {
    const teams = allDocs.map((d) => d.team).filter(Boolean);
    return [...new Set(teams)].sort();
  }, [allDocs]);

  // 작성자 목록 (문서에서 추출)
  const authorOptions = useMemo(() => {
    const authors = allDocs
      .map((d) => ({ id: d.author_id, name: d.author_name }))
      .filter((a) => a.id && a.name);
    const uniqueAuthors = Array.from(new Map(authors.map((a) => [a.id, a])).values());
    return uniqueAuthors.sort((a, b) => a.name.localeCompare(b.name));
  }, [allDocs]);

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
  }, [allUsers, debouncedUserSearch, userRoleFilter, userDeptFilter, userSort, userPage, userItemsPerPage]);

  // Filtered and paginated docs
  const { filteredDocs, paginatedDocs, totalDocPages } = useMemo(() => {
    let filtered = [...allDocs];

    // Search filter
    if (debouncedDocSearch) {
      const search = debouncedDocSearch.toLowerCase();
      filtered = filtered.filter((d) => d.title?.toLowerCase().includes(search));
    }

    // Team filter
    if (docTeamFilter) {
      filtered = filtered.filter((d) => d.team === docTeamFilter);
    }

    // Author filter
    if (docAuthorFilter) {
      filtered = filtered.filter((d) => d.author_id === docAuthorFilter);
    }

    const totalPages = Math.ceil(filtered.length / docItemsPerPage);
    const startIndex = (docPage - 1) * docItemsPerPage;
    const paginated = filtered.slice(startIndex, startIndex + docItemsPerPage);

    return { filteredDocs: filtered, paginatedDocs: paginated, totalDocPages: totalPages };
  }, [allDocs, debouncedDocSearch, docTeamFilter, docAuthorFilter, docPage, docItemsPerPage]);

  // Delete document
  const handleDeleteDoc = async (docId) => {
    const doc = allDocs.find((d) => d.id === docId);
    if (!doc) return;

    if (!confirmDeleteWithCSRF(doc.title)) {
      Toast.warning('제목이 일치하지 않습니다. 삭제가 취소되었습니다.');
      return;
    }

    try {
      await deleteDocument(docId);
      Toast.success('문서가 삭제되었습니다.');
    } catch (e) {
      console.error('Delete doc error:', e);
      Toast.error('문서 삭제에 실패했습니다: ' + e.message);
    }
  };

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

  if (isLoading || docsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
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

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="border-b flex">
          {['users', 'docs', 'stats'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 font-medium transition ${
                activeTab === tab
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'users' && '사용자 관리'}
              {tab === 'docs' && '콘텐츠 관리'}
              {tab === 'stats' && '통계'}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* Users Tab */}
          {activeTab === 'users' && (
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
                        {userSort.field === 'created_at' && (userSort.order === 'asc' ? '↑' : '↓')}
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
                          <td className="py-3 text-sm text-gray-500">{formatDate(u.created_at)}</td>
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
          )}

          {/* Docs Tab */}
          {activeTab === 'docs' && (
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex flex-wrap gap-3">
                <input
                  type="text"
                  value={docSearch}
                  onChange={(e) => setDocSearch(e.target.value)}
                  placeholder="제목 검색..."
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <select
                  value={docTeamFilter}
                  onChange={(e) => setDocTeamFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">모든 팀</option>
                  {teamOptions.map((team) => (
                    <option key={team} value={team}>
                      {team}
                    </option>
                  ))}
                </select>
                <select
                  value={docAuthorFilter}
                  onChange={(e) => setDocAuthorFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">모든 작성자</option>
                  {authorOptions.map((author) => (
                    <option key={author.id} value={author.id}>
                      {author.name}
                    </option>
                  ))}
                </select>
                <select
                  value={docItemsPerPage}
                  onChange={(e) => setDocItemsPerPage(Number(e.target.value))}
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
                {filteredDocs.length}개 중 {paginatedDocs.length}개 표시
              </p>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm text-gray-500 border-b">
                      <th className="pb-3 font-medium">제목</th>
                      <th className="pb-3 font-medium">팀</th>
                      <th className="pb-3 font-medium">작성자</th>
                      <th className="pb-3 font-medium">생성일</th>
                      <th className="pb-3 font-medium">액션</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedDocs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-gray-500">
                          검색 결과가 없습니다.
                        </td>
                      </tr>
                    ) : (
                      paginatedDocs.map((doc) => (
                        <tr key={doc.id} className="border-b last:border-0">
                          <td className="py-3">{doc.title}</td>
                          <td className="py-3 text-sm">{doc.team}</td>
                          <td className="py-3 text-sm">{doc.author_name}</td>
                          <td className="py-3 text-sm text-gray-500">
                            {formatDate(doc.created_at)}
                          </td>
                          <td className="py-3">
                            <button
                              onClick={() => handleDeleteDoc(doc.id)}
                              className="text-red-500 hover:text-red-700 text-sm"
                            >
                              삭제
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalDocPages > 1 && (
                <Pagination
                  currentPage={docPage}
                  totalPages={totalDocPages}
                  onPageChange={setDocPage}
                />
              )}
            </div>
          )}

          {/* Stats Tab */}
          {activeTab === 'stats' && (
            <div className="text-center py-8 text-gray-500">
              차트 컴포넌트가 여기에 표시됩니다.
              <br />
              (Chart.js 통합 예정 - Issue #54)
            </div>
          )}
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
