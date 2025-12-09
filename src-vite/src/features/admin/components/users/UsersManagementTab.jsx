// OJT Master - Users Management Tab Component
// Manages user list, filtering, pagination, and integrates with side panel and bulk actions

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Toast } from '@contexts/ToastContext';
import { supabase } from '@utils/api';
import { formatDate, sanitizeText } from '@utils/helpers';
import { useDebounce } from '@hooks/useDebounce';
import { ROLES } from '@/constants';
import UserDetailPanel from './UserDetailPanel';
import BulkActionsBar from './BulkActionsBar';

const DEFAULT_DEPARTMENTS = ['개발팀', '디자인팀', '기획팀', '마케팅팀', '운영팀', '인사팀'];
const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50];

export default function UsersManagementTab({ allUsers, setAllUsers, allDocs, isAdmin }) {
  const { user: currentUser } = useAuth();

  // Filter & Pagination state
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [userDeptFilter, setUserDeptFilter] = useState('');
  const [userPage, setUserPage] = useState(1);
  const [userItemsPerPage, setUserItemsPerPage] = useState(20);
  const [userSort, setUserSort] = useState({ field: 'created_at', order: 'desc' });

  // Side panel state
  const [selectedUserForPanel, setSelectedUserForPanel] = useState(null);

  // Bulk selection state
  const [selectedUserIds, setSelectedUserIds] = useState([]);

  // Debounced search
  const debouncedUserSearch = useDebounce(userSearch, 300);

  // Reset page when filters change
  useEffect(() => {
    setUserPage(1);
  }, [debouncedUserSearch, userRoleFilter, userDeptFilter, userItemsPerPage]);

  // Change user role
  const handleRoleChange = async (userId, newRole) => {
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

  // Change user department
  const handleDepartmentChange = async (userId, newDepartment) => {
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

  // Toggle user active status
  const handleToggleActive = async (userId, currentStatus) => {
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

  // Delete user
  const handleDeleteUser = async (userId) => {
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

  // Department options (default + existing)
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

  // Bulk selection handlers
  const handleToggleSelection = (userId) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    setSelectedUserIds(paginatedUsers.map((u) => u.id));
  };

  const handleDeselectAll = () => {
    setSelectedUserIds([]);
  };

  const handleBulkUpdate = async () => {
    // Reload users after bulk update
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setAllUsers(data);
      }
    } catch (e) {
      console.error('Reload users error:', e);
    }
    setSelectedUserIds([]);
  };

  // Handle row click to open side panel
  const handleRowClick = (user) => {
    setSelectedUserForPanel(user);
  };

  // Handle side panel update
  const handlePanelUpdate = (updatedUser) => {
    setAllUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
    setSelectedUserForPanel(updatedUser);
  };

  return (
    <div className="space-y-4">
      {/* Bulk Actions Bar */}
      <BulkActionsBar
        selectedUsers={selectedUserIds}
        allUsers={paginatedUsers}
        onSelectAll={handleSelectAll}
        onDeselectAll={handleDeselectAll}
        onBulkUpdate={handleBulkUpdate}
        isAdmin={isAdmin}
      />

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
              <th className="pb-3 w-8">
                <input
                  type="checkbox"
                  checked={selectedUserIds.length > 0}
                  onChange={(e) => (e.target.checked ? handleSelectAll() : handleDeselectAll())}
                  className="cursor-pointer"
                  aria-label="전체 선택"
                />
              </th>
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
                가입일 {userSort.field === 'created_at' && (userSort.order === 'asc' ? '↑' : '↓')}
              </th>
              <th className="pb-3 font-medium">액션</th>
            </tr>
          </thead>
          <tbody>
            {paginatedUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-gray-500">
                  검색 결과가 없습니다.
                </td>
              </tr>
            ) : (
              paginatedUsers.map((u) => (
                <tr
                  key={u.id}
                  className="border-b last:border-0 hover:bg-gray-50 cursor-pointer transition"
                  onClick={() => handleRowClick(u)}
                >
                  <td className="py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedUserIds.includes(u.id)}
                      onChange={() => handleToggleSelection(u.id)}
                      className="cursor-pointer"
                      aria-label={`${u.name} 선택`}
                    />
                  </td>
                  <td className="py-3">
                    {u.name}
                    {u.is_active === false && (
                      <span className="ml-2 text-xs text-red-500">(정지됨)</span>
                    )}
                  </td>
                  <td className="py-3" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={u.role || ''}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      className="px-2 py-1 border rounded text-sm"
                      disabled={u.id === currentUser?.id}
                    >
                      <option value="admin">Admin</option>
                      <option value="mentor">Mentor</option>
                      <option value="mentee">Mentee</option>
                    </select>
                  </td>
                  <td className="py-3" onClick={(e) => e.stopPropagation()}>
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
                  <td className="py-3" onClick={(e) => e.stopPropagation()}>
                    {u.id === currentUser?.id ? (
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
        <Pagination currentPage={userPage} totalPages={totalUserPages} onPageChange={setUserPage} />
      )}

      {/* User Detail Side Panel */}
      {selectedUserForPanel && (
        <UserDetailPanel
          user={selectedUserForPanel}
          onClose={() => setSelectedUserForPanel(null)}
          onUpdate={handlePanelUpdate}
          isAdmin={isAdmin}
          allDocs={allDocs}
        />
      )}
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
