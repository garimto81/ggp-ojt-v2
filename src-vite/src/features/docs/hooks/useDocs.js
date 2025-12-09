// OJT Master - React Query Hooks for Documents (Issue #58)
/**
 * ROLE: React Query - Server State Management
 *
 * PURPOSE:
 * - Supabase 문서 데이터 fetch, mutation, caching
 * - 서버-로컬 캐시 동기화 (Dexie.js fallback)
 * - 오프라인 지원 (네트워크 실패 시 로컬 캐시 사용)
 *
 * RESPONSIBILITY:
 * ✅ 서버 데이터 CRUD (Supabase ojt_docs 테이블)
 * ✅ 캐시 무효화 및 자동 refetch
 * ✅ 로컬 캐시와 서버 동기화 (dbSave, dbDelete)
 * ✅ 네트워크 에러 시 fallback 전략
 *
 * NOT RESPONSIBLE FOR:
 * ❌ UI 상태 관리 (selectedDoc, editingDoc) → DocsContext 사용
 * ❌ AI 생성 문서 임시 상태 → DocsContext 사용
 * ❌ 전역 앱 설정 → Context API 사용
 *
 * PATTERN: Query Keys Factory + Offline Fallback
 * - docsKeys 객체로 쿼리 키 중앙 관리
 * - try-catch에서 Supabase 실패 시 로컬 캐시 반환
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@utils/api';
import { dbGetAll, dbSave, dbDelete } from '@utils/db';
import { DOC_SELECT } from '@utils/security/safeFields';

// Query Keys
export const docsKeys = {
  all: ['docs'],
  lists: () => [...docsKeys.all, 'list'],
  list: (filters) => [...docsKeys.lists(), filters],
  details: () => [...docsKeys.all, 'detail'],
  detail: (id) => [...docsKeys.details(), id],
  myDocs: (userId) => [...docsKeys.all, 'my', userId],
};

/**
 * Fetch all documents from Supabase with local cache fallback
 */
async function fetchDocs(filters = {}) {
  try {
    // Issue #132: 명시적 필드 선택으로 민감 정보 노출 방지
    let query = supabase.from('ojt_docs').select(DOC_SELECT);

    if (filters.team) {
      query = query.eq('team', filters.team);
    }
    if (filters.authorId) {
      query = query.eq('author_id', filters.authorId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    // Sync to local cache
    if (data) {
      for (const doc of data) {
        await dbSave('ojt_docs', doc);
      }
    }

    return data || [];
  } catch (error) {
    // Fallback to local cache on network error
    console.warn('[useDocs] Supabase fetch failed, using local cache:', error.message);
    const localDocs = await dbGetAll('ojt_docs');
    return localDocs;
  }
}

/**
 * Fetch documents by author
 */
async function fetchMyDocs(userId) {
  if (!userId) return [];

  try {
    // Issue #132: 명시적 필드 선택
    const { data, error } = await supabase
      .from('ojt_docs')
      .select(DOC_SELECT)
      .eq('author_id', userId)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.warn('[useDocs] Fetch my docs failed:', error.message);
    const localDocs = await dbGetAll('ojt_docs');
    return localDocs.filter((d) => d.author_id === userId);
  }
}

/**
 * Create a new document
 */
async function createDoc(doc) {
  const { data, error } = await supabase.from('ojt_docs').insert(doc).select().single();

  if (error) throw error;

  // Sync to local cache
  await dbSave('ojt_docs', data);

  return data;
}

/**
 * Update an existing document
 */
async function updateDoc({ id, updates }) {
  const { data, error } = await supabase
    .from('ojt_docs')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  // Sync to local cache
  await dbSave('ojt_docs', data);

  return data;
}

/**
 * Delete a document
 */
async function deleteDoc(id) {
  const { error } = await supabase.from('ojt_docs').delete().eq('id', id);

  if (error) throw error;

  // Remove from local cache
  await dbDelete('ojt_docs', id);

  return id;
}

// ========== React Query Hooks ==========

/**
 * Fetch all documents with optional filters
 * @param {Object} filters - { team?: string, authorId?: string }
 */
export function useDocsQuery(filters = {}) {
  return useQuery({
    queryKey: docsKeys.list(filters),
    queryFn: () => fetchDocs(filters),
  });
}

/**
 * Fetch documents created by current user
 * @param {string} userId - Current user ID
 */
export function useMyDocs(userId) {
  return useQuery({
    queryKey: docsKeys.myDocs(userId),
    queryFn: () => fetchMyDocs(userId),
    enabled: !!userId, // Only fetch when userId is available
  });
}

/**
 * Create a new document
 */
export function useCreateDoc() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createDoc,
    onSuccess: () => {
      // Invalidate all docs queries to refetch
      queryClient.invalidateQueries({ queryKey: docsKeys.all });
    },
  });
}

/**
 * Update a document
 */
export function useUpdateDoc() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateDoc,
    onSuccess: (updatedDoc) => {
      // Update specific doc in cache
      queryClient.setQueryData(docsKeys.detail(updatedDoc.id), updatedDoc);
      // Invalidate lists to refetch
      queryClient.invalidateQueries({ queryKey: docsKeys.lists() });
    },
  });
}

/**
 * Delete a document
 */
export function useDeleteDoc() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteDoc,
    onSuccess: (deletedId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: docsKeys.detail(deletedId) });
      // Invalidate lists to refetch
      queryClient.invalidateQueries({ queryKey: docsKeys.lists() });
    },
  });
}

/**
 * Get available teams from cached docs
 */
export function useAvailableTeams() {
  const { data: docs = [] } = useDocsQuery();

  const teams = [...new Set(docs.map((d) => d.team).filter(Boolean))].sort();
  return teams;
}
