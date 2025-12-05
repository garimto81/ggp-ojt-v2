// OJT Master v2.3.0 - Documents Context

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
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

      const docData = {
        ...doc,
        id: doc.id || crypto.randomUUID(),
        author_id: doc.author_id || user.id,
        author_name: doc.author_name || user.name,
        created_at: doc.created_at || Date.now(),
        updated_at: Date.now(),
      };

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

  // Update document (partial update)
  const updateDocument = useCallback(
    async (docId, updates) => {
      if (!user) throw new Error('로그인이 필요합니다.');

      // Find existing document
      const existingDoc = allDocs.find((d) => d.id === docId);
      if (!existingDoc) throw new Error('문서를 찾을 수 없습니다.');

      const updatedDoc = {
        ...existingDoc,
        ...updates,
        id: docId, // Ensure ID is not overwritten
        updated_at: Date.now(),
      };

      await dbSave('ojt_docs', updatedDoc);

      // Refresh lists
      await loadAllDocs();
      await loadMyDocs();

      return updatedDoc;
    },
    [user, allDocs, loadAllDocs, loadMyDocs]
  );

  // Update a specific quiz in document
  const updateQuiz = useCallback(
    async (docId, quizIndex, quizUpdates) => {
      const doc = allDocs.find((d) => d.id === docId);
      if (!doc) throw new Error('문서를 찾을 수 없습니다.');
      if (!doc.quiz || !Array.isArray(doc.quiz)) throw new Error('퀴즈가 없습니다.');
      if (quizIndex < 0 || quizIndex >= doc.quiz.length) {
        throw new Error('잘못된 퀴즈 인덱스입니다.');
      }

      const updatedQuiz = [...doc.quiz];
      updatedQuiz[quizIndex] = {
        ...updatedQuiz[quizIndex],
        ...quizUpdates,
        is_placeholder: false, // Mark as edited (no longer placeholder)
      };

      return updateDocument(docId, { quiz: updatedQuiz });
    },
    [allDocs, updateDocument]
  );

  // Delete a specific quiz from document
  const deleteQuiz = useCallback(
    async (docId, quizIndex) => {
      const doc = allDocs.find((d) => d.id === docId);
      if (!doc) throw new Error('문서를 찾을 수 없습니다.');
      if (!doc.quiz || !Array.isArray(doc.quiz)) throw new Error('퀴즈가 없습니다.');
      if (quizIndex < 0 || quizIndex >= doc.quiz.length) {
        throw new Error('잘못된 퀴즈 인덱스입니다.');
      }

      // Minimum 4 quizzes required
      if (doc.quiz.length <= 4) {
        throw new Error('최소 4개의 퀴즈가 필요합니다.');
      }

      const updatedQuiz = doc.quiz.filter((_, idx) => idx !== quizIndex);
      return updateDocument(docId, { quiz: updatedQuiz });
    },
    [allDocs, updateDocument]
  );

  // Add a new quiz to document
  const addQuiz = useCallback(
    async (docId, newQuiz) => {
      const doc = allDocs.find((d) => d.id === docId);
      if (!doc) throw new Error('문서를 찾을 수 없습니다.');

      const quiz = doc.quiz || [];
      const updatedQuiz = [
        ...quiz,
        {
          ...newQuiz,
          is_placeholder: false,
        },
      ];

      return updateDocument(docId, { quiz: updatedQuiz });
    },
    [allDocs, updateDocument]
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
    updateDocument,
    deleteDocument,
    getDocsByTeam,
    clearGenerated,

    // Quiz CRUD
    updateQuiz,
    deleteQuiz,
    addQuiz,
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
