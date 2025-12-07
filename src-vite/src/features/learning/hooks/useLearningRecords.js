// OJT Master - React Query Hooks for Learning Records (Issue #58)

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@utils/api';

// Query Keys
export const learningKeys = {
  all: ['learningRecords'],
  lists: () => [...learningKeys.all, 'list'],
  list: (filters) => [...learningKeys.lists(), filters],
  byUser: (userId) => [...learningKeys.all, 'user', userId],
  byDoc: (docId) => [...learningKeys.all, 'doc', docId],
  stats: () => [...learningKeys.all, 'stats'],
};

/**
 * Fetch all learning records
 */
async function fetchLearningRecords(filters = {}) {
  let query = supabase.from('learning_records').select('*');

  if (filters.userId) {
    query = query.eq('user_id', filters.userId);
  }
  if (filters.docId) {
    query = query.eq('doc_id', filters.docId);
  }
  if (filters.passed !== undefined) {
    query = query.eq('passed', filters.passed);
  }

  const { data, error } = await query.order('completed_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Fetch learning records by user
 */
async function fetchUserRecords(userId) {
  if (!userId) return [];

  const { data, error } = await supabase
    .from('learning_records')
    .select('*')
    .eq('user_id', userId)
    .order('completed_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Save a new learning record
 */
async function saveLearningRecord(record) {
  const { data, error } = await supabase
    .from('learning_records')
    .insert({
      user_id: record.userId,
      doc_id: record.docId,
      score: record.score,
      total_questions: record.totalQuestions,
      passed: record.passed,
      completed_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Calculate learning statistics
 */
async function fetchLearningStats() {
  const { data, error } = await supabase.from('learning_records').select('*');

  if (error) throw error;

  const records = data || [];
  const totalRecords = records.length;
  const passedRecords = records.filter((r) => r.passed).length;
  const passRate = totalRecords > 0 ? Math.round((passedRecords / totalRecords) * 100) : 0;

  // Group by user
  const userStats = records.reduce((acc, r) => {
    if (!acc[r.user_id]) {
      acc[r.user_id] = { total: 0, passed: 0 };
    }
    acc[r.user_id].total++;
    if (r.passed) acc[r.user_id].passed++;
    return acc;
  }, {});

  return {
    totalRecords,
    passedRecords,
    passRate,
    uniqueUsers: Object.keys(userStats).length,
    userStats,
  };
}

// ========== React Query Hooks ==========

/**
 * Fetch all learning records with optional filters
 */
export function useLearningRecords(filters = {}) {
  return useQuery({
    queryKey: learningKeys.list(filters),
    queryFn: () => fetchLearningRecords(filters),
  });
}

/**
 * Fetch learning records for a specific user
 */
export function useUserLearningRecords(userId) {
  return useQuery({
    queryKey: learningKeys.byUser(userId),
    queryFn: () => fetchUserRecords(userId),
    enabled: !!userId,
  });
}

/**
 * Save a learning record (after quiz completion)
 */
export function useSaveLearningRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: saveLearningRecord,
    onSuccess: (newRecord) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: learningKeys.all });
    },
  });
}

/**
 * Fetch learning statistics (for admin dashboard)
 */
export function useLearningStats() {
  return useQuery({
    queryKey: learningKeys.stats(),
    queryFn: fetchLearningStats,
    staleTime: 1 * 60 * 1000, // 1 minute stale time for stats
  });
}
