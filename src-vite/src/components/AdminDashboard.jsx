// OJT Master v2.9.3 - Admin Dashboard Component

import { useState, useEffect, useMemo } from 'react';
import { useDocs } from '../contexts/DocsContext';
import { useAuth } from '../contexts/AuthContext';
import { Toast } from '../contexts/ToastContext';
import { supabase } from '../utils/api';
import { confirmDeleteWithCSRF, formatDate } from '../utils/helpers';

// 기본 부서 목록
const DEFAULT_DEPARTMENTS = ['개발팀', '디자인팀', '기획팀', '마케팅팀', '운영팀', '인사팀'];

export default function AdminDashboard() {
  const { allDocs, deleteDocument, isLoading: docsLoading } = useDocs();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('users');
  const [allUsers, setAllUsers] = useState([]);
  const [allRecords, setAllRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load admin data
  useEffect(() => {
    const loadAdminData = async () => {
      setIsLoading(true);
      try {
        // Load users
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('*')
          .order('created_at', { ascending: false });

        if (!usersError) setAllUsers(users || []);

        // Load learning records
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

  // Toggle user active status (정지/활성화)
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

    if (!window.confirm(`정말 ${targetUser?.name}님을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) {
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
      <div className="grid grid-cols-4 gap-4">
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
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-gray-500 border-b">
                    <th className="pb-3 font-medium">이름</th>
                    <th className="pb-3 font-medium">역할</th>
                    <th className="pb-3 font-medium">부서</th>
                    <th className="pb-3 font-medium">가입일</th>
                    <th className="pb-3 font-medium">액션</th>
                  </tr>
                </thead>
                <tbody>
                  {allUsers.map((u) => (
                    <tr key={u.id} className="border-b last:border-0">
                      <td className="py-3">{u.name}</td>
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
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Docs Tab */}
          {activeTab === 'docs' && (
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
                  {allDocs.map((doc) => (
                    <tr key={doc.id} className="border-b last:border-0">
                      <td className="py-3">{doc.title}</td>
                      <td className="py-3 text-sm">{doc.team}</td>
                      <td className="py-3 text-sm">{doc.author_name}</td>
                      <td className="py-3 text-sm text-gray-500">{formatDate(doc.created_at)}</td>
                      <td className="py-3">
                        <button
                          onClick={() => handleDeleteDoc(doc.id)}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Stats Tab */}
          {activeTab === 'stats' && (
            <div className="text-center py-8 text-gray-500">
              차트 컴포넌트가 여기에 표시됩니다.
              <br />
              (Chart.js 통합 예정)
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
