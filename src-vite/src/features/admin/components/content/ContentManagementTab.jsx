// ContentManagementTab.jsx - 콘텐츠 관리 탭 (Split View 컨테이너)

import { useState, useMemo, useCallback } from 'react';
import { Allotment } from 'allotment';
import 'allotment/dist/style.css';

import ContentListPanel from './ContentListPanel';
import ContentPreviewPanel from './ContentPreviewPanel';
import { Toast } from '@/contexts/ToastContext';
import { supabase } from '@/utils/api';

export default function ContentManagementTab({ docs, onDocDeleted, isAdmin }) {
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [reports, setReports] = useState([]);
  const [isLoadingReports, setIsLoadingReports] = useState(false);

  // 팀 목록 추출
  const teamOptions = useMemo(() => {
    const teams = docs.map((d) => d.team).filter(Boolean);
    return [...new Set(teams)].sort();
  }, [docs]);

  // 작성자 목록 추출
  const authorOptions = useMemo(() => {
    const authors = docs
      .map((d) => ({ id: d.author_id, name: d.author_name }))
      .filter((a) => a.id && a.name);
    const uniqueAuthors = Array.from(new Map(authors.map((a) => [a.id, a])).values());
    return uniqueAuthors.sort((a, b) => a.name.localeCompare(b.name));
  }, [docs]);

  // 문서 선택 시 신고 목록 로드
  // NOTE: content_reports 테이블이 DB에 없을 수 있음 - graceful 처리
  const handleSelectDoc = useCallback(async (doc) => {
    setSelectedDoc(doc);

    if (doc.report_count > 0) {
      setIsLoadingReports(true);
      try {
        const { data, error } = await supabase
          .from('content_reports')
          .select('*, reporter:users!reporter_id(name)')
          .eq('doc_id', doc.id)
          .order('created_at', { ascending: false });

        // 테이블 없음 에러 (404) 또는 권한 에러 - 빈 배열 반환
        if (error) {
          if (
            error.code === 'PGRST116' ||
            error.code === '42501' ||
            error.message?.includes('404')
          ) {
            console.warn('content_reports 테이블 접근 불가:', error.message);
            setReports([]);
            return;
          }
          throw error;
        }

        // reporter 이름 추출
        const reportsWithName = (data || []).map((r) => ({
          ...r,
          reporter_name: r.reporter?.name,
        }));
        setReports(reportsWithName);
      } catch (e) {
        console.error('Failed to load reports:', e);
        setReports([]);
      } finally {
        setIsLoadingReports(false);
      }
    } else {
      setReports([]);
    }
  }, []);

  // 문서 상태 변경
  const handleStatusChange = useCallback(
    async (docId, newStatus) => {
      if (!isAdmin) {
        Toast.error('관리자 권한이 필요합니다.');
        return;
      }

      const statusLabels = {
        draft: '임시저장',
        review: '검토대기',
        published: '게시됨',
        hidden: '숨김',
      };

      if (!window.confirm(`상태를 "${statusLabels[newStatus]}"(으)로 변경하시겠습니까?`)) {
        return;
      }

      try {
        const { error } = await supabase
          .from('ojt_docs')
          .update({
            status: newStatus,
            last_reviewed_at: new Date().toISOString(),
          })
          .eq('id', docId);

        if (error) throw error;

        Toast.success(`상태가 "${statusLabels[newStatus]}"(으)로 변경되었습니다.`);

        // 선택된 문서 상태 업데이트
        if (selectedDoc?.id === docId) {
          setSelectedDoc((prev) => ({ ...prev, status: newStatus }));
        }

        // 부모 컴포넌트에서 문서 목록 새로고침 필요
        // docs는 prop이므로 DocsContext에서 refetch 필요
      } catch (e) {
        console.error('Status change error:', e);
        Toast.error('상태 변경에 실패했습니다: ' + e.message);
      }
    },
    [isAdmin, selectedDoc]
  );

  // 문서 삭제
  const handleDelete = useCallback(
    async (docId) => {
      if (!isAdmin) {
        Toast.error('관리자 권한이 필요합니다.');
        return;
      }

      try {
        const { error } = await supabase.from('ojt_docs').delete().eq('id', docId);

        if (error) throw error;

        Toast.success('문서가 삭제되었습니다.');

        // 선택 해제
        if (selectedDoc?.id === docId) {
          setSelectedDoc(null);
        }

        // 부모 컴포넌트에 알림
        if (onDocDeleted) {
          onDocDeleted(docId);
        }
      } catch (e) {
        console.error('Delete error:', e);
        Toast.error('문서 삭제에 실패했습니다: ' + e.message);
      }
    },
    [isAdmin, selectedDoc, onDocDeleted]
  );

  // 신고 처리
  // NOTE: content_reports 테이블이 DB에 없을 수 있음 - graceful 처리
  const handleResolveReport = useCallback(
    async (reportId, action) => {
      if (!isAdmin) {
        Toast.error('관리자 권한이 필요합니다.');
        return;
      }

      try {
        const { error } = await supabase
          .from('content_reports')
          .update({
            status: action,
            resolved_at: new Date().toISOString(),
          })
          .eq('id', reportId);

        // 테이블 없음 에러 처리
        if (error) {
          if (error.code === 'PGRST116' || error.message?.includes('404')) {
            Toast.warning('신고 기능이 아직 활성화되지 않았습니다.');
            return;
          }
          throw error;
        }

        Toast.success(action === 'resolved' ? '신고가 해결되었습니다.' : '신고가 기각되었습니다.');

        // 신고 목록 업데이트
        setReports((prev) =>
          prev.map((r) =>
            r.id === reportId ? { ...r, status: action, resolved_at: new Date().toISOString() } : r
          )
        );
      } catch (e) {
        console.error('Resolve report error:', e);
        Toast.error('신고 처리에 실패했습니다: ' + e.message);
      }
    },
    [isAdmin]
  );

  return (
    <div className="h-[calc(100vh-280px)] min-h-[500px]" role="region" aria-label="콘텐츠 관리">
      <Allotment defaultSizes={[40, 60]}>
        <Allotment.Pane minSize={280} preferredSize="40%">
          <ContentListPanel
            docs={docs}
            selectedDocId={selectedDoc?.id}
            onSelectDoc={handleSelectDoc}
            onStatusChange={handleStatusChange}
            onDelete={handleDelete}
            teamOptions={teamOptions}
            authorOptions={authorOptions}
          />
        </Allotment.Pane>
        <Allotment.Pane minSize={350} preferredSize="60%">
          <ContentPreviewPanel
            doc={selectedDoc}
            reports={isLoadingReports ? [] : reports}
            onStatusChange={handleStatusChange}
            onDelete={handleDelete}
            onResolveReport={handleResolveReport}
          />
        </Allotment.Pane>
      </Allotment>
    </div>
  );
}
