// OJT Master - User Detail Side Panel Component
// Displays detailed user information, learning progress, and actions

import { useState, useEffect } from 'react';

import { ROLES } from '@/constants';
import { Toast } from '@/contexts/ToastContext';
import { supabase } from '@/utils/api';
import { formatDate, sanitizeText } from '@/utils/helpers';

const DEFAULT_DEPARTMENTS = ['개발팀', '디자인팀', '기획팀', '마케팅팀', '운영팀', '인사팀'];

export default function UserDetailPanel({ user, onClose, onUpdate, isAdmin, allDocs = [] }) {
  const [loading, setLoading] = useState(true);
  const [learningStats, setLearningStats] = useState({
    totalRecords: 0,
    passedRecords: 0,
    avgScore: 0,
    progressPercent: 0,
    recentActivity: [],
  });
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({
    role: user?.role || '',
    department: user?.department || '',
  });

  // Fetch user's learning statistics and recent activity
  useEffect(() => {
    if (!user?.id) return;

    const loadUserStats = async () => {
      setLoading(true);
      try {
        // Fetch learning records for this user
        const { data: records, error } = await supabase
          .from('learning_records')
          .select('*')
          .eq('user_id', user.id)
          .order('completed_at', { ascending: false });

        if (error) throw error;

        const totalRecords = records?.length || 0;
        const passedRecords = records?.filter((r) => r.passed).length || 0;
        const avgScore =
          totalRecords > 0
            ? Math.round(records.reduce((sum, r) => sum + r.score, 0) / totalRecords)
            : 0;

        const totalDocs = allDocs.length;
        const progressPercent = totalDocs > 0 ? Math.round((passedRecords / totalDocs) * 100) : 0;

        // Recent 5 activities
        const recentActivity = (records || []).slice(0, 5).map((r) => {
          const doc = allDocs.find((d) => d.id === r.doc_id);
          return {
            id: r.id,
            docTitle: doc?.title || '알 수 없는 문서',
            score: r.score,
            totalQuestions: r.total_questions,
            passed: r.passed,
            completedAt: r.completed_at,
          };
        });

        setLearningStats({
          totalRecords,
          passedRecords,
          avgScore,
          progressPercent,
          recentActivity,
        });
      } catch (e) {
        console.error('User stats load error:', e);
        Toast.error('사용자 통계를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    loadUserStats();
  }, [user?.id, allDocs]);

  // Handle role/department update
  const handleSaveChanges = async () => {
    if (!isAdmin) {
      Toast.error('관리자 권한이 필요합니다.');
      return;
    }

    if (
      !window.confirm(
        `${sanitizeText(user?.name)}님의 정보를 변경하시겠습니까?\n역할: ${editData.role}\n부서: ${editData.department || '(없음)'}`
      )
    ) {
      return;
    }

    try {
      const { error } = await supabase
        .from('users')
        .update({
          role: editData.role,
          department: editData.department || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      Toast.success('사용자 정보가 업데이트되었습니다.');
      setEditMode(false);
      onUpdate({ ...user, role: editData.role, department: editData.department });
    } catch (e) {
      console.error('Update user error:', e);
      Toast.error('사용자 정보 업데이트에 실패했습니다: ' + e.message);
    }
  };

  if (!user) return null;

  return (
    <aside
      role="complementary"
      aria-label="사용자 상세 정보"
      className="fixed top-0 right-0 z-50 flex h-full w-96 flex-col bg-white shadow-2xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-gradient-to-r from-blue-50 to-indigo-50 p-4">
        <h2 className="text-lg font-bold text-gray-800">사용자 상세</h2>
        <button
          onClick={onClose}
          className="text-xl text-gray-500 hover:text-gray-700"
          aria-label="사이드 패널 닫기"
        >
          ✕
        </button>
      </div>

      {/* Body - Scrollable */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {/* Basic Info */}
        <div className="rounded-lg bg-gray-50 p-4">
          <h3 className="mb-3 text-sm font-bold text-gray-700">기본 정보</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">이름</span>
              <span className="font-medium">{sanitizeText(user.name)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">이메일</span>
              <span className="text-xs font-medium">{user.email || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">가입일</span>
              <span className="font-medium">{formatDate(user.created_at)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">상태</span>
              <span
                className={`rounded px-2 py-1 text-xs ${
                  user.is_active === false
                    ? 'bg-red-100 text-red-700'
                    : 'bg-green-100 text-green-700'
                }`}
              >
                {user.is_active === false ? '정지됨' : '활성'}
              </span>
            </div>
          </div>
        </div>

        {/* Role & Department - Editable */}
        <div className="rounded-lg bg-gray-50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-700">역할 및 부서</h3>
            {isAdmin && !editMode && (
              <button
                onClick={() => {
                  setEditMode(true);
                  setEditData({ role: user.role, department: user.department || '' });
                }}
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                편집
              </button>
            )}
          </div>

          {editMode ? (
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs text-gray-500">역할</label>
                <select
                  value={editData.role}
                  onChange={(e) => setEditData({ ...editData, role: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value={ROLES.ADMIN}>Admin</option>
                  <option value={ROLES.MENTOR}>Mentor</option>
                  <option value={ROLES.MENTEE}>Mentee</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-500">부서</label>
                <select
                  value={editData.department}
                  onChange={(e) => setEditData({ ...editData, department: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">선택 안함</option>
                  {DEFAULT_DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveChanges}
                  className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
                >
                  저장
                </button>
                <button
                  onClick={() => setEditMode(false)}
                  className="flex-1 rounded-lg bg-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-300"
                >
                  취소
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">역할</span>
                <span className="font-medium">{user.role}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">부서</span>
                <span className="font-medium">{user.department || '-'}</span>
              </div>
            </div>
          )}
        </div>

        {/* Learning Stats */}
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          </div>
        ) : (
          <>
            <div className="rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
              <h3 className="mb-3 text-sm font-bold text-gray-700">학습 현황</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-white p-3">
                  <p className="mb-1 text-xs text-gray-500">총 학습</p>
                  <p className="text-lg font-bold text-blue-600">{learningStats.totalRecords}</p>
                </div>
                <div className="rounded-lg bg-white p-3">
                  <p className="mb-1 text-xs text-gray-500">통과</p>
                  <p className="text-lg font-bold text-green-600">{learningStats.passedRecords}</p>
                </div>
                <div className="rounded-lg bg-white p-3">
                  <p className="mb-1 text-xs text-gray-500">평균 점수</p>
                  <p className="text-lg font-bold text-purple-600">{learningStats.avgScore}점</p>
                </div>
                <div className="rounded-lg bg-white p-3">
                  <p className="mb-1 text-xs text-gray-500">진도율</p>
                  <p className="text-lg font-bold text-orange-600">
                    {learningStats.progressPercent}%
                  </p>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            {learningStats.recentActivity.length > 0 && (
              <div className="rounded-lg bg-gray-50 p-4">
                <h3 className="mb-3 text-sm font-bold text-gray-700">최근 활동</h3>
                <div className="space-y-2">
                  {learningStats.recentActivity.map((activity) => (
                    <div
                      key={activity.id}
                      className="rounded-lg border border-gray-200 bg-white p-3"
                    >
                      <div className="mb-1 flex items-start justify-between">
                        <p className="line-clamp-1 text-xs font-medium text-gray-800">
                          {sanitizeText(activity.docTitle)}
                        </p>
                        <span
                          className={`rounded px-2 py-0.5 text-xs ${
                            activity.passed
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {activity.passed ? '통과' : '미통과'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>
                          {activity.score}/{activity.totalQuestions}
                        </span>
                        <span>{formatDate(activity.completedAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
}
