// OJT Master v2.14.0 - Documents Context (Issue #126: Refactored)
/**
 * ROLE: Context API - Client UI State Management Only
 *
 * PURPOSE:
 * - UI 상태 관리 (선택된 문서, 편집 중인 문서)
 * - AI 생성 문서 임시 상태 (저장 전)
 *
 * RESPONSIBILITY:
 * ✅ UI 상태: selectedDoc, editingDoc
 * ✅ AI 생성 임시 상태: generatedDoc, generatedDocs (저장 전)
 * ✅ 팀 목록 파생 상태: availableTeams (useMemo)
 *
 * NOT RESPONSIBLE FOR (Issue #126 - Migrated to React Query):
 * ❌ 서버 데이터 CRUD → features/docs/hooks/useDocs.js 사용
 *    - useDocsQuery() for fetching docs
 *    - useMyDocs() for user's docs
 *    - useCreateDoc() for creating docs
 *    - useUpdateDoc() for updating docs
 *    - useDeleteDoc() for deleting docs
 *
 * ARCHITECTURE:
 * - Context: UI state only (selectedDoc, editingDoc, generatedDoc)
 * - React Query: Server state (CRUD operations with cache)
 */

import { createContext, useContext, useState, useCallback } from 'react';

const DocsContext = createContext(null);

export function DocsProvider({ children }) {
  // UI State: Selected document for viewing/editing
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [editingDoc, setEditingDoc] = useState(null);

  // AI Generated document (temporary, before saving)
  const [generatedDoc, setGeneratedDoc] = useState(null);
  const [generatedDocs, setGeneratedDocs] = useState([]);

  // Clear generated documents
  const clearGenerated = useCallback(() => {
    setGeneratedDoc(null);
    setGeneratedDocs([]);
  }, []);

  // Clear editing state when doc is deleted
  const clearDocState = useCallback((docId) => {
    setSelectedDoc((prev) => (prev?.id === docId ? null : prev));
    setEditingDoc((prev) => (prev?.id === docId ? null : prev));
  }, []);

  const value = {
    // UI State
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
    clearGenerated,
    clearDocState,
  };

  return <DocsContext.Provider value={value}>{children}</DocsContext.Provider>;
}

/**
 * Hook for UI state only (Issue #126)
 * For server data operations, use React Query hooks from @features/docs/hooks/useDocs.js:
 * - useDocsQuery() / useMyDocs() for fetching
 * - useCreateDoc() / useUpdateDoc() / useDeleteDoc() for mutations
 */
export function useDocsContext() {
  const context = useContext(DocsContext);
  if (!context) {
    throw new Error('useDocsContext must be used within a DocsProvider');
  }
  return context;
}

// Deprecated: use useDocsContext instead
// Kept for backward compatibility during migration
export { useDocsContext as useDocs };
