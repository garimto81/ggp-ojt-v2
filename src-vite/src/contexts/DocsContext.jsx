// OJT Master v2.3.0 - Documents Context

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

import { supabase } from '../utils/api';
import { dbGetAll, dbSave, dbDelete } from '../utils/db';
import { sanitizeDocData } from '../utils/helpers';

import { useAuth } from './AuthContext';

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
    setIsLoading(true);
    try {
      const docs = await dbGetAll('ojt_docs');
      const sanitizedDocs = docs.map(sanitizeDocData);
      sanitizedDocs.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setAllDocs(sanitizedDocs);
    } catch (error) {
      console.error('Load all docs error:', error);
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

      // 세션 검증: Supabase 인증 세션 확인 (Issue #188)
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        console.error('[DocsContext] 세션 없음 - 저장 불가');
        throw new Error('인증 세션이 만료되었습니다. 페이지를 새로고침하고 다시 로그인해주세요.');
      }

      // 신규 문서는 'review' 상태로 저장 (Issue #186)
      // 기존 문서 수정 시에는 기존 status 유지
      const isNewDoc = !doc.id;

      // DB 스키마에 없는 필드 제거 (UI 표시용 필드들)
      // ai_engine: Gemini/WebLLM 뱃지 표시용
      // ai_processed: AI 처리 성공 여부 표시용
      // ai_error: AI 에러 메시지 표시용
      // eslint-disable-next-line no-unused-vars
      const { ai_engine, ai_processed, ai_error, ...docWithoutUIFields } = doc;

      const docData = {
        ...docWithoutUIFields,
        id: doc.id || crypto.randomUUID(),
        author_id: doc.author_id || user.id,
        author_name: doc.author_name || user.name,
        status: doc.status || (isNewDoc ? 'review' : 'published'),
        created_at: doc.created_at || new Date().toISOString(), // ISO 문자열 (Issue #188)
        updated_at: new Date().toISOString(),
      };

      // 디버깅: 저장 데이터 타입 검증 (Issue #188)
      console.log('[DocsContext] 저장 데이터:', {
        id: { value: docData.id, type: typeof docData.id },
        title: { value: docData.title?.substring(0, 20), type: typeof docData.title },
        team: { value: docData.team, type: typeof docData.team },
        step: { value: docData.step, type: typeof docData.step },
        sections: { length: docData.sections?.length, isArray: Array.isArray(docData.sections) },
        quiz: { length: docData.quiz?.length, isArray: Array.isArray(docData.quiz) },
        author_id: { value: docData.author_id, type: typeof docData.author_id },
        status: { value: docData.status, type: typeof docData.status },
        created_at: { value: docData.created_at, type: typeof docData.created_at },
        updated_at: { value: docData.updated_at, type: typeof docData.updated_at },
      });

      await dbSave('ojt_docs', docData);

      // Refresh lists
      await loadAllDocs();
      await loadMyDocs();

      return docData;
    },
    [user, loadAllDocs, loadMyDocs]
  );

  // Delete document
  const deleteDocument = useCallback(
    async (docId) => {
      await dbDelete('ojt_docs', docId);

      // Update local state
      setAllDocs((prev) => prev.filter((d) => d.id !== docId));
      setMyDocs((prev) => prev.filter((d) => d.id !== docId));

      if (selectedDoc?.id === docId) {
        setSelectedDoc(null);
      }
      if (editingDoc?.id === docId) {
        setEditingDoc(null);
      }
    },
    [selectedDoc?.id, editingDoc?.id]
  );

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
