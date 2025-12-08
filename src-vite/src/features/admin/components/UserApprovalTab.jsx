// OJT Master v2.13.6 - User Approval Tab (Issue #105)
/**
 * Admin 사용자 승인 관리 탭
 *
 * - 승인 대기 사용자 목록 표시
 * - 승인/거부 기능
 * - 처리 내역 표시
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@utils/api';
import { USER_STATUS, AUTH_PROVIDER, ROLES, ROLE_COLORS } from '@/constants';
import { useAuth } from '@features/auth/hooks/AuthContext';

// Query keys
const approvalKeys = {
  all: ['user-approvals'],
  pending: () => [...approvalKeys.all, 'pending'],
  recent: () => [...approvalKeys.all, 'recent'],
};

// 승인 대기 사용자 조회
async function fetchPendingUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('auth_provider', AUTH_PROVIDER.EMAIL)
    .eq('status', USER_STATUS.PENDING)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// 최근 처리 내역 조회 (승인/거부된 Email 사용자)
async function fetchRecentApprovals() {
  const { data, error } = await supabase
    .from('users')
    .select('*, approver:approved_by(name)')
    .eq('auth_provider', AUTH_PROVIDER.EMAIL)
    .in('status', [USER_STATUS.APPROVED, USER_STATUS.REJECTED])
    .not('approved_at', 'is', null)
    .order('approved_at', { ascending: false })
    .limit(10);

  if (error) throw error;
  return data || [];
}

// 사용자 승인/거부
async function updateUserStatus({ userId, status, adminId }) {
  const updateData = {
    status,
    approved_by: adminId,
    approved_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('users').update(updateData).eq('id', userId);

  if (error) throw error;
  return { userId, status };
}

export default function UserApprovalTab() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [processingId, setProcessingId] = useState(null);

  // 승인 대기 목록 조회
  const {
    data: pendingUsers = [],
    isLoading: isPendingLoading,
    error: pendingError,
  } = useQuery({
    queryKey: approvalKeys.pending(),
    queryFn: fetchPendingUsers,
    refetchInterval: 30000, // 30초마다 갱신
  });

  // 최근 처리 내역 조회
  const { data: recentApprovals = [], isLoading: isRecentLoading } = useQuery({
    queryKey: approvalKeys.recent(),
    queryFn: fetchRecentApprovals,
  });

  // 승인/거부 mutation
  const statusMutation = useMutation({
    mutationFn: updateUserStatus,
    onMutate: ({ userId }) => {
      setProcessingId(userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: approvalKeys.all });
    },
    onSettled: () => {
      setProcessingId(null);
    },
  });

  // 승인 처리
  const handleApprove = (userId) => {
    if (!currentUser?.id) return;
    statusMutation.mutate({
      userId,
      status: USER_STATUS.APPROVED,
      adminId: currentUser.id,
    });
  };

  // 거부 처리
  const handleReject = (userId) => {
    if (!currentUser?.id) return;
    if (!confirm('정말 이 사용자의 가입을 거부하시겠습니까?')) return;
    statusMutation.mutate({
      userId,
      status: USER_STATUS.REJECTED,
      adminId: currentUser.id,
    });
  };

  // 역할 뱃지
  const RoleBadge = ({ role }) => {
    const colors = ROLE_COLORS[role] || ROLE_COLORS[ROLES.MENTEE];
    const labels = {
      [ROLES.ADMIN]: 'Admin',
      [ROLES.MENTOR]: 'Mentor',
      [ROLES.MENTEE]: 'Mentee',
    };
    return (
      <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${colors.badge}`}>
        {labels[role] || role}
      </span>
    );
  };

  // 상태 뱃지
  const StatusBadge = ({ status }) => {
    const statusConfig = {
      [USER_STATUS.APPROVED]: {
        label: '승인됨',
        className: 'bg-green-100 text-green-700 border-green-200',
      },
      [USER_STATUS.REJECTED]: {
        label: '거부됨',
        className: 'bg-red-100 text-red-700 border-red-200',
      },
    };
    const config = statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-700' };
    return (
      <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${config.className}`}>
        {config.label}
      </span>
    );
  };

  // 날짜 포맷
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  if (pendingError) {
    return (
      <div className="p-6 text-center text-red-600">
        <p>데이터를 불러오는 중 오류가 발생했습니다.</p>
        <p className="text-sm mt-2">{pendingError.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 승인 대기 목록 */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></span>
            승인 대기
            {pendingUsers.length > 0 && (
              <span className="ml-2 px-2 py-0.5 text-sm bg-yellow-100 text-yellow-700 rounded-full">
                {pendingUsers.length}
              </span>
            )}
          </h3>
        </div>

        {isPendingLoading ? (
          <div className="text-center py-8 text-gray-500">불러오는 중...</div>
        ) : pendingUsers.length === 0 ? (
          <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
            승인 대기 중인 사용자가 없습니다.
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">이름</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">이메일</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">역할</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">신청일</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">작업</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pendingUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-800 font-medium">{user.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{user.email || '-'}</td>
                    <td className="px-4 py-3">
                      <RoleBadge role={user.role} />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{formatDate(user.created_at)}</td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        onClick={() => handleApprove(user.id)}
                        disabled={processingId === user.id}
                        className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {processingId === user.id ? '처리 중...' : '승인'}
                      </button>
                      <button
                        onClick={() => handleReject(user.id)}
                        disabled={processingId === user.id}
                        className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        거부
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 최근 처리 내역 */}
      <section>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">최근 처리 내역</h3>

        {isRecentLoading ? (
          <div className="text-center py-8 text-gray-500">불러오는 중...</div>
        ) : recentApprovals.length === 0 ? (
          <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
            처리 내역이 없습니다.
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">이름</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">상태</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">처리자</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">처리일</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentApprovals.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-800 font-medium">{user.name}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={user.status} />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {user.approver?.name || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {formatDate(user.approved_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
