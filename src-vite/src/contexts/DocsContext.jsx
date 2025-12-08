// OJT Master v2.3.0 - Documents Context
/**
 * ROLE: Context API - Client State Management (Legacy + UI State)
 *
 * PURPOSE:
 * - UI 상태 관리 (선택된 문서, 편집 중인 문서)
 * - AI 생성 문서 임시 상태 (저장 전)
 * - 로컬 캐시 직접 조회 (useDocs React Query와 병행 사용)
 *
 * RESPONSIBILITY:
 * ✅ UI 상태: selectedDoc, editingDoc
 * ✅ AI 생성 임시 상태: generatedDoc, generatedDocs (저장 전)
 * ✅ 로컬 캐시 직접 조회: allDocs, myDocs (dbGetAll)
 * ✅ 팀 목록 파생 상태: availableTeams (useMemo)
 *
 * NOT RESPONSIBLE FOR:
 * ❌ 서버 데이터 동기화 → useDocs (React Query) 사용 권장
 * ❌ 캐시 무효화 전략 → React Query가 처리
 *
 * MIGRATION NOTE (Issue #75):
 * - 현재 DocsContext와 useDocs (React Query)가 병행 사용 중
 * - 점진적 마이그레이션 전략:
 *   1. 서버 데이터 CRUD → useDocs (React Query) 사용
 *   2. UI 상태 → DocsContext 유지
 *   3. AI 생성 임시 상태 → DocsContext 유지
 * - 향후 리팩토링: saveDocument, deleteDocument 제거하고
 *   useCreateDoc, useUpdateDoc, useDeleteDoc로 완전 전환
 */

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { dbGetAll, dbSave, dbDelete } from '@utils/db';
import { sanitizeDocData } from '@utils/helpers';
import { useAuth } from '@features/auth/hooks/AuthContext';

const DocsContext = createContext(null);

export function DocsProvider({ children }) {
  const { user } = useAuth();

  // Document states
  const [allDocs, setAllDocs] = useState([]);
  const [myDocs, setMyDocs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Selected document for viewing/editing
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [editingDoc, setEditingDoc] = useState(null);

  // Generated document (from AI)
  const [generatedDoc, setGeneratedDoc] = useState(null);
  const [generatedDocs, setGeneratedDocs] = useState([]);

  // Available teams (derived from docs)
  const availableTeams = useMemo(() => {
    const teams = [...new Set(allDocs.map((d) => d.team).filter(Boolean))];
    return teams.sort();
  }, [allDocs]);

  // Load all documents
  const loadAllDocs = useCallback(async () => {
    console.log('[Docs] loadAllDocs called');
    setIsLoading(true);
    try {
      const docs = await dbGetAll('ojt_docs');
      console.log('[Docs] Loaded docs count:', docs.length);
      const sanitizedDocs = docs.map(sanitizeDocData);
      sanitizedDocs.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setAllDocs(sanitizedDocs);
    } catch (error) {
      console.error('[Docs] Load all docs error:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load user's documents
  const loadMyDocs = useCallback(async () => {
    if (!user?.id) return;

    try {
      const docs = await dbGetAll('ojt_docs', { authorId: user.id });
      const sanitizedDocs = docs.map(sanitizeDocData);
      sanitizedDocs.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setMyDocs(sanitizedDocs);
    } catch (error) {
      console.error('Load my docs error:', error);
    }
  }, [user?.id]);

  // Initial load
  useEffect(() => {
    loadAllDocs();
  }, [loadAllDocs]);

  // Load user's docs when user changes
  useEffect(() => {
    if (user?.id) {
      loadMyDocs();
    }
  }, [user?.id, loadMyDocs]);

  // Save document
  const saveDocument = useCallback(
    async (doc) => {
      if (!user) throw new Error('로그인이 필요합니다.');

      const docData = {
        ...doc,
        id: doc.id || crypto.randomUUID(),
        author_id: doc.author_id || user.id,
        author_name: doc.author_name || user.name,
        status: doc.status || 'review', // 새 문서는 검토 대기 상태로 시작
        created_at: doc.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      console.log('[Docs] Saving document:', docData.id, docData.title);
      const savedData = await dbSave('ojt_docs', docData);

      // sync 상태 로깅
      if (savedData?._syncPending) {
        console.warn('[Docs] Document saved locally, pending sync to server');
      } else {
        console.log('[Docs] Document saved to server successfully');
      }

      // Refresh lists
      await loadAllDocs();
      await loadMyDocs();

      return savedData;
    },
    [user, loadAllDocs, loadMyDocs]
  );

  // Delete document
  const deleteDocument = useCallback(async (docId) => {
    await dbDelete('ojt_docs', docId);

    // Update local state
    setAllDocs((prev) => prev.filter((d) => d.id !== docId));
    setMyDocs((prev) => prev.filter((d) => d.id !== docId));

    // Clear selected/editing if deleted
    setSelectedDoc((prev) => (prev?.id === docId ? null : prev));
    setEditingDoc((prev) => (prev?.id === docId ? null : prev));
  }, []);

  // Get documents by team
  const getDocsByTeam = useCallback(
    (team) => {
      if (!team) return allDocs;
      return allDocs.filter((d) => d.team === team);
    },
    [allDocs]
  );

  // Clear generated documents
  const clearGenerated = useCallback(() => {
    setGeneratedDoc(null);
    setGeneratedDocs([]);
  }, []);

  const value = {
    // State
    allDocs,
    myDocs,
    isLoading,
    availableTeams,
    selectedDoc,
    editingDoc,
    generatedDoc,
    generatedDocs,

    // Setters
    setSelectedDoc,
    setEditingDoc,
    setGeneratedDoc,
    setGeneratedDocs,

    // Actions
    loadAllDocs,
    loadMyDocs,
    saveDocument,
    deleteDocument,
    getDocsByTeam,
    clearGenerated,
  };

  return <DocsContext.Provider value={value}>{children}</DocsContext.Provider>;
}

export function useDocs() {
  const context = useContext(DocsContext);
  if (!context) {
    throw new Error('useDocs must be used within a DocsProvider');
  }
  return context;
}
