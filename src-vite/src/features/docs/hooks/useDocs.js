// OJT Master v2.10.0 - React Query Hooks for Documents
// 역할: 서버 상태 관리 (Supabase 데이터 fetching, 캐싱, 동기화)
// 참고: UI 상태(selectedDoc 등)는 @contexts/DocsContext 사용

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@utils/api';
import { dbGetAll, dbSave, dbDelete } from '@utils/db';

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
    let query = supabase.from('ojt_docs').select('*');

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
    const { data, error } = await supabase
      .from('ojt_docs')
      .select('*')
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
export function useDocs(filters = {}) {
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
    onSuccess: (newDoc) => {
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
  const { data: docs = [] } = useDocs();

  const teams = [...new Set(docs.map((d) => d.team).filter(Boolean))].sort();
  return teams;
}
