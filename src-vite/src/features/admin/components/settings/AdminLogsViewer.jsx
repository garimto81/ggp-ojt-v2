// OJT Master - Admin Logs Viewer Component
// audit_logs 실제 스키마 기반 (v2.17.3)

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import { ROLES } from '@/constants';

const LOG_TYPE_ICONS = {
  INFO: { icon: 'ℹ️', color: 'text-blue-600', bg: 'bg-blue-50' },
  WARN: { icon: '⚠️', color: 'text-yellow-600', bg: 'bg-yellow-50' },
  ERROR: { icon: '❌', color: 'text-red-600', bg: 'bg-red-50' },
};

const ITEMS_PER_PAGE = 20;

/**
 * Admin Logs Viewer Component
 * - audit_logs 테이블 조회 (실제 스키마 기반)
 * - 스키마: id, event_type, table_name, record_id, old_value, new_value,
 *          performed_by, ip_address, user_agent, metadata, created_at
 */
export function AdminLogsViewer() {
  const { user } = useAuth();
  const isAdmin = user?.role === ROLES.ADMIN;

  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [tableError, setTableError] = useState(null);

  // Load logs from Supabase
  useEffect(() => {
    const loadLogs = async () => {
      if (!isAdmin) return;

      setIsLoading(true);
      setTableError(null);
      try {
        const { data, error, count } = await supabase
          .from('audit_logs')
          .select('*', { count: 'exact' })
          .order('created_at', { ascending: false })
          .range(0, ITEMS_PER_PAGE * page - 1);

        if (error) {
          // 테이블 없음 또는 권한 에러 처리
          if (
            error.code === 'PGRST116' ||
            error.code === '42501' ||
            error.message?.includes('404')
          ) {
            setTableError('로그 테이블에 접근할 수 없습니다.');
            return;
          }
          throw error;
        }

        setLogs(data || []);
        setHasMore((count || 0) > ITEMS_PER_PAGE * page);
      } catch (error) {
        console.error('Logs load error:', error);
        setTableError('로그를 불러오는 중 오류가 발생했습니다.');
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

  // Get log type based on event_type (UPPERCASE 기준)
  const getLogType = (eventType) => {
    if (!eventType) return 'INFO';
    const upper = eventType.toUpperCase();
    if (upper.includes('DELETE') || upper.includes('ERROR')) return 'ERROR';
    if (upper.includes('UPDATE') || upper.includes('CHANGE')) return 'WARN';
    return 'INFO';
  };

  // Format event_type text (DB CHECK 제약조건 기준)
  // 허용값: ROLE_CHANGE, LOGIN, LOGOUT, DOC_CREATE, DOC_UPDATE, DOC_DELETE, SECURITY_ALERT, SETTINGS_UPDATE
  const formatEventType = (eventType) => {
    if (!eventType) return '알 수 없음';
    const eventMap = {
      // DB CHECK 제약조건 허용 타입
      ROLE_CHANGE: '사용자 역할 변경',
      LOGIN: '로그인',
      LOGOUT: '로그아웃',
      DOC_CREATE: '문서 생성',
      DOC_UPDATE: '문서 수정',
      DOC_DELETE: '문서 삭제',
      SECURITY_ALERT: '보안 경고',
      SETTINGS_UPDATE: '시스템 설정 변경',
    };
    return eventMap[eventType] || eventType;
  };

  // Format table_name (실제 스키마 필드)
  const formatTableName = (tableName) => {
    const tableMap = {
      users: '사용자',
      ojt_docs: 'OJT 문서',
      admin_settings: '시스템 설정',
      learning_records: '학습 기록',
      teams: '팀',
    };
    return tableMap[tableName] || tableName || '';
  };

  if (isLoading && page === 1) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // 테이블 에러 시 안내 메시지 표시
  if (tableError) {
    return (
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">시스템 로그</h3>
        <div className="py-8 text-center text-gray-500">
          <p className="text-amber-600">{tableError}</p>
          <p className="text-sm mt-2">관리자에게 문의하세요.</p>
        </div>
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
              // 실제 스키마 필드 사용: event_type, table_name, metadata
              const logType = getLogType(log.event_type);
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
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-medium ${typeStyle.color}`}>
                        {formatEventType(log.event_type)}
                      </span>
                      {log.table_name && (
                        <span className="text-xs bg-gray-200 px-2 py-0.5 rounded">
                          {formatTableName(log.table_name)}
                        </span>
                      )}
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

                    {/* Metadata details (실제 스키마 필드) */}
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <div className="mt-1 text-sm text-gray-600">
                        {log.table_name === 'admin_settings' && (
                          <span>
                            부서: {log.metadata.departments || 0}개, 기본 역할:{' '}
                            {log.metadata.defaultRole}, 통과 점수: {log.metadata.quizPassScore}
                          </span>
                        )}
                        {log.table_name === 'users' && log.metadata.userName && (
                          <span>사용자: {log.metadata.userName}</span>
                        )}
                        {log.table_name === 'ojt_docs' && log.metadata.docTitle && (
                          <span>문서: {log.metadata.docTitle}</span>
                        )}
                        {/* 기타 metadata 표시 */}
                        {!['admin_settings', 'users', 'ojt_docs'].includes(log.table_name) && (
                          <span className="text-xs text-gray-400">
                            {JSON.stringify(log.metadata).substring(0, 100)}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Record ID (for debugging) */}
                    {log.record_id && (
                      <div className="mt-1 text-xs text-gray-400 font-mono">
                        ID: {log.record_id.substring(0, 8)}...
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
