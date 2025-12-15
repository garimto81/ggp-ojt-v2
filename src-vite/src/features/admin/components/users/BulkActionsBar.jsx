// OJT Master - Bulk Actions Bar Component
// Allows admins to perform actions on multiple selected users

import { useState } from 'react';
import { supabase } from '@/utils/api';
import { Toast } from '@/contexts/ToastContext';
import { ROLES } from '@/constants';

const DEFAULT_DEPARTMENTS = ['개발팀', '디자인팀', '기획팀', '마케팅팀', '운영팀', '인사팀'];

export default function BulkActionsBar({
  selectedUsers,
  allUsers,
  onSelectAll,
  onDeselectAll,
  onBulkUpdate,
  isAdmin,
}) {
  const [bulkRole, setBulkRole] = useState('');
  const [bulkDepartment, setBulkDepartment] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const selectedCount = selectedUsers.length;
  const totalCount = allUsers.length;
  const allSelected = selectedCount > 0 && selectedCount === totalCount;

  // Handle bulk role change
  const handleBulkRoleChange = async () => {
    if (!isAdmin) {
      Toast.error('관리자 권한이 필요합니다.');
      return;
    }

    if (!bulkRole) {
      Toast.warning('변경할 역할을 선택하세요.');
      return;
    }

    if (!window.confirm(`선택된 ${selectedCount}명의 역할을 ${bulkRole}(으)로 변경하시겠습니까?`)) {
      return;
    }

    setIsProcessing(true);
    try {
      const updates = selectedUsers.map((userId) =>
        supabase
          .from('users')
          .update({ role: bulkRole, updated_at: new Date().toISOString() })
          .eq('id', userId)
      );

      await Promise.all(updates);

      Toast.success(`${selectedCount}명의 역할이 변경되었습니다.`);
      onBulkUpdate();
      setBulkRole('');
    } catch (e) {
      console.error('Bulk role change error:', e);
      Toast.error('역할 일괄 변경에 실패했습니다: ' + e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle bulk department change
  const handleBulkDepartmentChange = async () => {
    if (!isAdmin) {
      Toast.error('관리자 권한이 필요합니다.');
      return;
    }

    if (!bulkDepartment) {
      Toast.warning('변경할 부서를 선택하세요.');
      return;
    }

    if (
      !window.confirm(
        `선택된 ${selectedCount}명의 부서를 ${bulkDepartment}(으)로 변경하시겠습니까?`
      )
    ) {
      return;
    }

    setIsProcessing(true);
    try {
      const updates = selectedUsers.map((userId) =>
        supabase
          .from('users')
          .update({
            department: bulkDepartment || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId)
      );

      await Promise.all(updates);

      Toast.success(`${selectedCount}명의 부서가 변경되었습니다.`);
      onBulkUpdate();
      setBulkDepartment('');
    } catch (e) {
      console.error('Bulk department change error:', e);
      Toast.error('부서 일괄 변경에 실패했습니다: ' + e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (selectedCount === 0) return null;

  return (
    <div className="sticky top-0 z-10 mb-4 rounded-lg border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-4">
        {/* Selection Info */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={(e) => (e.target.checked ? onSelectAll() : onDeselectAll())}
            className="h-4 w-4 cursor-pointer"
            aria-label={allSelected ? '전체 선택 해제' : '전체 선택'}
          />
          <span className="text-sm font-medium text-gray-700">{selectedCount}명 선택됨</span>
          {selectedCount > 0 && (
            <button
              onClick={onDeselectAll}
              className="text-xs text-blue-600 underline hover:text-blue-700"
            >
              선택 해제
            </button>
          )}
        </div>

        {/* Divider */}
        <div className="hidden h-8 w-px bg-gray-300 md:block" />

        {/* Bulk Role Change */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-600">역할 일괄 변경:</label>
          <select
            value={bulkRole}
            onChange={(e) => setBulkRole(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            disabled={isProcessing}
          >
            <option value="">선택하세요</option>
            <option value={ROLES.ADMIN}>Admin</option>
            <option value={ROLES.MENTOR}>Mentor</option>
            <option value={ROLES.MENTEE}>Mentee</option>
          </select>
          <button
            onClick={handleBulkRoleChange}
            disabled={!bulkRole || isProcessing}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isProcessing ? '처리 중...' : '적용'}
          </button>
        </div>

        {/* Bulk Department Change */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-600">부서 일괄 변경:</label>
          <select
            value={bulkDepartment}
            onChange={(e) => setBulkDepartment(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            disabled={isProcessing}
          >
            <option value="">선택하세요</option>
            {DEFAULT_DEPARTMENTS.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
          <button
            onClick={handleBulkDepartmentChange}
            disabled={!bulkDepartment || isProcessing}
            className="rounded-lg bg-green-600 px-3 py-1.5 text-sm text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isProcessing ? '처리 중...' : '적용'}
          </button>
        </div>
      </div>
    </div>
  );
}
