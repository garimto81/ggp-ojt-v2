// OJT Master v2.14.0 - Database Utilities (Local-Only Architecture)
// Issue #114: Simplified for direct server fetch, removed IndexedDB cache

/**
 * ARCHITECTURE CHANGE (Issue #114):
 * - Removed: Dexie.js (IndexedDB) local cache
 * - Removed: Offline sync queue
 * - Changed: All operations directly fetch from PostgreSQL via REST API
 * - Benefit: Simplified codebase, single source of truth (server)
 */

// Default timeout for server queries
const SERVER_QUERY_TIMEOUT = 10000; // 10 seconds

/**
 * Wrap a promise with a timeout
 */
function withTimeout(promise, ms) {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Query timeout after ${ms}ms`)), ms)
  );
  return Promise.race([promise, timeout]);
}

/**
 * Get all records from a table with optional filter
 * @param {string} table - Table name
 * @param {Object} filter - Optional filter object
 * @returns {Promise<Array>} - Array of records
 */
export async function dbGetAll(table, filter = null) {
  try {
    // Check Supabase connection
    if (!window.supabase) {
      console.error(`[dbGetAll] No Supabase connection for ${table}`);
      return [];
    }

    // Build Supabase query
    let query = window.supabase.from(table).select('*');

    if (filter) {
      Object.entries(filter).forEach(([key, value]) => {
        // Convert camelCase to snake_case for Supabase
        const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        query = query.eq(snakeKey, value);
      });
    }

    // Execute with timeout to prevent infinite loading
    const { data, error } = await withTimeout(query, SERVER_QUERY_TIMEOUT);

    if (error) {
      console.error(`[dbGetAll] Server error for ${table}:`, error.message, error.code);
      // RLS permission error
      if (error.code === '42501' || error.message?.includes('permission')) {
        console.error(`[dbGetAll] RLS permission denied for ${table}. Check database policies.`);
      }
      return [];
    }

    console.log(`[dbGetAll] Server returned ${data?.length || 0} items for ${table}`);
    return data || [];
  } catch (error) {
    console.error(`[dbGetAll] Error for ${table}:`, error);
    return [];
  }
}

/**
 * Save a record to the server database
 * @param {string} table - Table name
 * @param {Object} data - Data to save
 * @returns {Promise<Object>} - Saved data
 */
export async function dbSave(table, data) {
  try {
    // Check Supabase connection
    if (!window.supabase) {
      throw new Error('서버 연결 없음. 네트워크를 확인하세요.');
    }

    const { data: savedData, error } = await window.supabase
      .from(table)
      .upsert(data)
      .select()
      .single();

    if (error) {
      console.error(`[dbSave] Server error for ${table}:`, error.message, error.code);

      // RLS permission error - throw user-friendly message
      if (error.code === '42501' || error.message?.includes('permission') || error.message?.includes('policy')) {
        const permissionError = new Error(`저장 권한이 없습니다. 관리자에게 문의하세요. (${error.message})`);
        permissionError.isPermissionError = true;
        permissionError.originalError = error;
        throw permissionError;
      }

      // Other errors
      throw new Error(`저장 실패: ${error.message}`);
    }

    console.info(`[dbSave] Saved to server: ${table}`, savedData?.id);
    return savedData;
  } catch (error) {
    console.error(`[dbSave] Error for ${table}:`, error);
    throw error;
  }
}

/**
 * Delete a record from the server database
 * @param {string} table - Table name
 * @param {string} id - Record ID
 */
export async function dbDelete(table, id) {
  try {
    // Check Supabase connection
    if (!window.supabase) {
      throw new Error('서버 연결 없음. 네트워크를 확인하세요.');
    }

    const { error } = await window.supabase.from(table).delete().eq('id', id);

    if (error) {
      console.error(`[dbDelete] Server error for ${table}:`, error.message);
      throw new Error(`삭제 실패: ${error.message}`);
    }

    console.info(`[dbDelete] Deleted from server: ${table}`, id);
  } catch (error) {
    console.error(`[dbDelete] Error for ${table}:`, error);
    throw error;
  }
}

/**
 * DEPRECATED: Local cache functions removed
 * Use React Query for client-side caching instead
 */
export async function clearAllCache() {
  console.warn('[DB] clearAllCache is deprecated (no local cache in local-only architecture)');
}

export async function getSyncQueueStatus() {
  console.warn('[DB] getSyncQueueStatus is deprecated (no sync queue in local-only architecture)');
  return { pending: 0, processing: false };
}

export async function processSyncQueue() {
  console.warn('[DB] processSyncQueue is deprecated (no sync queue in local-only architecture)');
  return { success: 0, failed: 0, deprecated: true };
}
