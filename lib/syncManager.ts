"use client";

import { supabase } from "./supabase";
import { syncQueue, isOnline, onOnlineStatusChange, SyncQueueItem } from "./offlineStorage";

const MAX_RETRIES = 3;
let isSyncing = false;
let syncListeners: Array<(syncing: boolean, pending: number) => void> = [];

// Notify listeners of sync status changes
function notifyListeners(syncing: boolean, pending: number) {
  syncListeners.forEach(listener => listener(syncing, pending));
}

// Process a single sync item
async function processSyncItem(item: SyncQueueItem): Promise<boolean> {
  if (!supabase) return false;

  try {
    switch (item.operation) {
      case "create": {
        const { error } = await supabase
          .from(item.table)
          .insert(item.data);
        return !error;
      }
      case "update": {
        const { id, ...updateData } = item.data;
        const { error } = await supabase
          .from(item.table)
          .update(updateData)
          .eq("id", id);
        return !error;
      }
      case "delete": {
        const { error } = await supabase
          .from(item.table)
          .delete()
          .eq("id", item.data.id);
        return !error;
      }
      default:
        return false;
    }
  } catch {
    return false;
  }
}

// Process all pending sync items
export async function processSync(): Promise<{ success: number; failed: number }> {
  if (isSyncing || !isOnline()) {
    return { success: 0, failed: 0 };
  }

  isSyncing = true;
  let success = 0;
  let failed = 0;

  try {
    const items = await syncQueue.getAll();

    // Sort by timestamp (oldest first)
    items.sort((a, b) => a.timestamp - b.timestamp);

    let pendingCount = items.length;
    notifyListeners(true, pendingCount);

    for (const item of items) {
      // Skip items that have exceeded max retries
      if (item.retries >= MAX_RETRIES) {
        await syncQueue.remove(item.id);
        failed++;
        pendingCount--;
        notifyListeners(true, pendingCount);
        continue;
      }

      const processed = await processSyncItem(item);

      if (processed) {
        await syncQueue.remove(item.id);
        success++;
        pendingCount--;
      } else {
        await syncQueue.incrementRetry(item.id);
        failed++;
      }

      // Update pending count using local counter instead of DB query
      notifyListeners(true, pendingCount);
    }
  } finally {
    isSyncing = false;
    const remaining = await syncQueue.getAll();
    notifyListeners(false, remaining.length);
  }

  return { success, failed };
}

// Add item to sync queue
export async function queueOperation(
  operation: SyncQueueItem["operation"],
  table: string,
  data: Record<string, unknown>
): Promise<boolean> {
  const added = await syncQueue.add({ operation, table, data });

  // If online, try to sync immediately
  if (isOnline()) {
    // Debounce sync to batch multiple operations
    setTimeout(() => processSync(), 100);
  }

  return added;
}

// Subscribe to sync status changes
export function onSyncStatusChange(
  callback: (syncing: boolean, pending: number) => void
): () => void {
  syncListeners.push(callback);

  // Get initial pending count
  syncQueue.getAll().then(items => {
    callback(false, items.length);
  });

  return () => {
    syncListeners = syncListeners.filter(l => l !== callback);
  };
}

// Initialize sync manager
export function initSyncManager() {
  // Listen for online status and sync when coming back online
  return onOnlineStatusChange(async (online) => {
    if (online) {
      // Wait a bit for connection to stabilize
      setTimeout(() => processSync(), 1000);
    }
  });
}

// Get pending sync count
export async function getPendingSyncCount(): Promise<number> {
  const items = await syncQueue.getAll();
  return items.length;
}

// Clear all pending sync items (use with caution)
export async function clearPendingSync(): Promise<void> {
  await syncQueue.clear();
  notifyListeners(false, 0);
}
