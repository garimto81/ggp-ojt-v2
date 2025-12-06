// OJT Master v2.10.0 - Database Utilities (Dexie.js) - Issue #60

import Dexie from 'dexie';

// Initialize Dexie database
export const localDb = new Dexie('OJT_LocalDB');

// Schema with compound indexes for optimized queries
localDb.version(2).stores({
  users: 'id, name, role, department',
  ojt_docs: 'id, team, step, author_id, updated_at, [team+step], [author_id+updated_at]',
  learning_records: 'id, user_id, doc_id, completed_at, [user_id+doc_id], [user_id+completed_at]',
  sync_queue: '++id, table, action, created_at, retries',
});

// Sync queue processing flag
let isSyncQueueProcessing = false;

// Sync configuration
const SYNC_CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 1000, // Base delay (multiplied by retry count)
  QUERY_TIMEOUT_MS: 10000, // 10 seconds
};

// Default timeout for Supabase queries
const SUPABASE_QUERY_TIMEOUT = SYNC_CONFIG.QUERY_TIMEOUT_MS;

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
    const localData = await localDb[table].toArray();

    // Return local data if no supabase connection
    if (!window.supabase) {
      return localData;
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
    const { data: remoteData, error } = await withTimeout(query, SUPABASE_QUERY_TIMEOUT);

    if (error) {
      console.warn(`Supabase error for ${table}:`, error);
      return localData;
    }

    // Sync local cache with remote data
    if (remoteData && remoteData.length > 0) {
      await Promise.all(remoteData.map((item) => localDb[table].put(item)));

      // Remove items that no longer exist on remote (for filtered queries)
      if (filter) {
        const remoteIds = new Set(remoteData.map((item) => item.id));
        const toDelete = localData.filter((item) => !remoteIds.has(item.id));
        if (toDelete.length > 0) {
          await Promise.all(toDelete.map((item) => localDb[table].delete(item.id)));
        }
      }

      return remoteData;
    }

    return localData;
  } catch (error) {
    console.error(`dbGetAll error for ${table}:`, error);
    return [];
  }
}

/**
 * Save a record to both local and remote database
 * @param {string} table - Table name
 * @param {Object} data - Data to save
 * @returns {Promise<Object>} - Saved data
 */
export async function dbSave(table, data) {
  try {
    // Save to local first
    await localDb[table].put(data);

    // Try to save to remote
    if (window.supabase) {
      const { data: savedData, error } = await window.supabase
        .from(table)
        .upsert(data)
        .select()
        .single();

      if (error) {
        // Queue for later sync
        await addToSyncQueue(table, 'upsert', data);
        console.warn(`Queued ${table} for sync:`, error);
      } else {
        return savedData;
      }
    } else {
      // Queue for later sync
      await addToSyncQueue(table, 'upsert', data);
    }

    return data;
  } catch (error) {
    console.error(`dbSave error for ${table}:`, error);
    throw error;
  }
}

/**
 * Delete a record from both local and remote database
 * @param {string} table - Table name
 * @param {string} id - Record ID
 */
export async function dbDelete(table, id) {
  try {
    // Delete from local first
    await localDb[table].delete(id);

    // Try to delete from remote
    if (window.supabase) {
      const { error } = await window.supabase.from(table).delete().eq('id', id);

      if (error) {
        // Queue for later sync
        await addToSyncQueue(table, 'delete', { id });
        console.warn(`Queued delete for ${table}:`, error);
      }
    } else {
      // Queue for later sync
      await addToSyncQueue(table, 'delete', { id });
    }
  } catch (error) {
    console.error(`dbDelete error for ${table}:`, error);
    throw error;
  }
}

/**
 * Add an action to the sync queue
 * @param {string} table - Table name
 * @param {string} action - 'upsert' or 'delete'
 * @param {Object} data - Data to sync
 */
async function addToSyncQueue(table, action, data) {
  await localDb.sync_queue.add({
    table,
    action,
    data,
    created_at: Date.now(),
    retries: 0,
  });
}

/**
 * Get sync queue status
 * @returns {Promise<{pending: number, processing: boolean}>}
 */
export async function getSyncQueueStatus() {
  const count = await localDb.sync_queue.count();
  return {
    pending: count,
    processing: isSyncQueueProcessing,
  };
}

/**
 * Process the sync queue with retry logic (Issue #60)
 * @param {Function} onProgress - Optional callback for progress updates
 * @returns {Promise<{success: number, failed: number}>}
 */
export async function processSyncQueue(onProgress) {
  // Prevent concurrent processing
  if (isSyncQueueProcessing) {
    return { success: 0, failed: 0, skipped: true };
  }

  // Check if online
  if (!navigator.onLine) {
    return { success: 0, failed: 0, offline: true };
  }

  // Check if supabase is available
  if (!window.supabase) {
    return { success: 0, failed: 0, noSupabase: true };
  }

  isSyncQueueProcessing = true;
  let successCount = 0;
  let failedCount = 0;

  try {
    const queue = await localDb.sync_queue.orderBy('created_at').toArray();

    if (queue.length === 0) {
      return { success: 0, failed: 0, empty: true };
    }

    if (onProgress) {
      onProgress({ status: 'start', total: queue.length });
    }

    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      const currentRetries = item.retries || 0;

      try {
        let error = null;

        if (item.action === 'upsert') {
          const result = await withTimeout(
            window.supabase.from(item.table).upsert(item.data),
            SYNC_CONFIG.QUERY_TIMEOUT_MS
          );
          error = result.error;
        } else if (item.action === 'delete') {
          const result = await withTimeout(
            window.supabase.from(item.table).delete().eq('id', item.data.id),
            SYNC_CONFIG.QUERY_TIMEOUT_MS
          );
          error = result.error;
        }

        if (!error) {
          // Success - remove from queue
          await localDb.sync_queue.delete(item.id);
          successCount++;

          if (onProgress) {
            onProgress({
              status: 'progress',
              current: i + 1,
              total: queue.length,
              item: { table: item.table, action: item.action },
            });
          }
        } else {
          throw error;
        }
      } catch (error) {
        const newRetries = currentRetries + 1;

        if (newRetries >= SYNC_CONFIG.MAX_RETRIES) {
          // Max retries reached - remove from queue (per CLAUDE.md rule)
          console.error(
            `[SyncQueue] Failed after ${SYNC_CONFIG.MAX_RETRIES} retries:`,
            item.table,
            item.action,
            error.message
          );
          await localDb.sync_queue.delete(item.id);
          failedCount++;
        } else {
          // Update retry count
          await localDb.sync_queue.update(item.id, { retries: newRetries });

          // Exponential backoff delay
          const delay = SYNC_CONFIG.RETRY_DELAY_MS * newRetries;
          await new Promise((r) => setTimeout(r, delay));
        }
      }
    }

    if (onProgress) {
      onProgress({
        status: 'complete',
        success: successCount,
        failed: failedCount,
      });
    }

    return { success: successCount, failed: failedCount };
  } catch (error) {
    console.error('[SyncQueue] Processing error:', error);
    return { success: successCount, failed: failedCount, error: error.message };
  } finally {
    isSyncQueueProcessing = false;
  }
}

/**
 * Clear all local cache
 */
export async function clearAllCache() {
  await localDb.users.clear();
  await localDb.ojt_docs.clear();
  await localDb.learning_records.clear();
  await localDb.sync_queue.clear();
  console.info('[DB] All cache cleared');
}

/**
 * Handle online event - process sync queue with notifications
 */
async function handleOnlineEvent() {
  console.info('[DB] Online detected, processing sync queue...');

  const result = await processSyncQueue((progress) => {
    if (progress.status === 'start') {
      console.info(`[DB] Syncing ${progress.total} items...`);
    }
  });

  // Show notification if there were items to sync
  if (result.success > 0 || result.failed > 0) {
    // Dispatch custom event for UI notification
    window.dispatchEvent(
      new CustomEvent('syncComplete', {
        detail: {
          success: result.success,
          failed: result.failed,
        },
      })
    );
  }
}

// Auto-process sync queue when online
if (typeof window !== 'undefined') {
  window.addEventListener('online', handleOnlineEvent);

  // Also check on page load if there are pending items
  window.addEventListener('load', async () => {
    if (navigator.onLine) {
      const status = await getSyncQueueStatus();
      if (status.pending > 0) {
        console.info(`[DB] Found ${status.pending} pending sync items on load`);
        handleOnlineEvent();
      }
    }
  });
}
