// OJT Master - Admin Logs Viewer Component

import { useState, useEffect } from 'react';
import { supabase } from '@utils/api';
import { Toast } from '@contexts/ToastContext';
import { useAuth } from '@features/auth/hooks/AuthContext';
import { ROLES } from '@/constants';
import { Spinner } from '@components/ui';

const LOG_TYPE_ICONS = {
  INFO: { icon: 'ℹ️', color: 'text-blue-600', bg: 'bg-blue-50' },
  WARN: { icon: '⚠️', color: 'text-yellow-600', bg: 'bg-yellow-50' },
  ERROR: { icon: '❌', color: 'text-red-600', bg: 'bg-red-50' },
};

const ITEMS_PER_PAGE = 20;

/**
 * Admin Logs Viewer Component
 * - admin_logs 테이블 조회
 * - 최신 20개 표시
 * - 더 보기 버튼
 * - 로그 타입별 아이콘
 */
export function AdminLogsViewer() {
  const { user } = useAuth();
  const isAdmin = user?.role === ROLES.ADMIN;

  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);

  // Load logs from Supabase
  useEffect(() => {
    const loadLogs = async () => {
      if (!isAdmin) return;

      setIsLoading(true);
      try {
        const { data, error, count } = await supabase
          .from('admin_logs')
          .select('*', { count: 'exact' })
          .order('created_at', { ascending: false })
          .range(0, ITEMS_PER_PAGE * page - 1);

        if (error) throw error;

        setLogs(data || []);
        setHasMore((count || 0) > ITEMS_PER_PAGE * page);
      } catch (error) {
        console.error('Logs load error:', error);
        // 403 에러 시 RLS 정책 문제 안내
        if (error.code === '42501' || error.message?.includes('permission denied')) {
          Toast.error(
            '권한 오류: RLS 정책을 확인하세요. (database/fixes/supabase_fix_admin_rls.sql)'
          );
        } else {
          Toast.error('로그를 불러오는 중 오류가 발생했습니다.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadLogs();
  }, [isAdmin, page]);

  // Load more logs
  const handleLoadMore = () => {
    setPage((prev) => prev + 1);
  };

  // Get log type based on action
  const getLogType = (action) => {
    if (action.includes('delete') || action.includes('error')) return 'ERROR';
    if (action.includes('update') || action.includes('change')) return 'WARN';
    return 'INFO';
  };

  // Format action text
  const formatAction = (action) => {
    const actionMap = {
      update_settings: '시스템 설정 변경',
      change_role: '사용자 역할 변경',
      delete_user: '사용자 삭제',
      delete_doc: '문서 삭제',
      update_doc_status: '문서 상태 변경',
      resolve_report: '신고 처리',
    };
    return actionMap[action] || action;
  };

  if (isLoading && page === 1) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner size="sm" color="primary" />
      </div>
    );
  }

  return (
    <div className="bg-white border rounded-lg p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-800">시스템 로그</h3>
        <span className="text-sm text-gray-500">최근 {logs.length}개 표시</span>
      </div>

      {logs.length === 0 ? (
        <div className="py-8 text-center text-gray-500">로그가 없습니다.</div>
      ) : (
        <>
          <div className="space-y-2">
            {logs.map((log) => {
              const logType = getLogType(log.action);
              const typeStyle = LOG_TYPE_ICONS[logType];

              return (
                <div
                  key={log.id}
                  className={`flex items-start gap-3 p-3 rounded-lg ${typeStyle.bg} border border-gray-200`}
                >
                  {/* Icon */}
                  <div className="text-xl" aria-hidden="true">
                    {typeStyle.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${typeStyle.color}`}>
                        {formatAction(log.action)}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(log.created_at).toLocaleString('ko-KR', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    {/* Details */}
                    {log.details && (
                      <div className="mt-1 text-sm text-gray-600">
                        {log.target_type === 'user' && log.details.userName && (
                          <span>사용자: {log.details.userName}</span>
                        )}
                        {log.target_type === 'doc' && log.details.docTitle && (
                          <span>문서: {log.details.docTitle}</span>
                        )}
                        {log.target_type === 'setting' && (
                          <span>
                            부서: {log.details.departments || 0}개, 기본 역할:{' '}
                            {log.details.defaultRole}, 통과 점수: {log.details.quizPassScore}
                          </span>
                        )}
                        {log.target_type === 'report' && log.details.reason && (
                          <span>사유: {log.details.reason}</span>
                        )}
                      </div>
                    )}

                    {/* Target ID (for debugging) */}
                    {log.target_id && (
                      <div className="mt-1 text-xs text-gray-400 font-mono">
                        ID: {log.target_id.substring(0, 8)}...
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Load More Button */}
          {hasMore && (
            <div className="flex justify-center pt-4">
              <button
                onClick={handleLoadMore}
                disabled={isLoading}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {isLoading ? '로드 중...' : '더 보기'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
