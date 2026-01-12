"use client";

import { supabase } from "./supabase";
import { syncQueue, failedSyncStorage, isOnline, onOnlineStatusChange, SyncQueueItem, FailedSyncItem } from "./offlineStorage";

const MAX_RETRIES = 3;
let isSyncing = false;
let syncListeners: Array<(syncing: boolean, pending: number) => void> = [];
let failedListeners: Array<(count: number) => void> = [];

// Notify listeners of sync status changes
function notifyListeners(syncing: boolean, pending: number) {
  syncListeners.forEach(listener => listener(syncing, pending));
}

// Notify listeners of failed sync count changes
function notifyFailedListeners(count: number) {
  failedListeners.forEach(listener => listener(count));
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
      // Move items that have exceeded max retries to failed storage
      if (item.retries >= MAX_RETRIES) {
        await failedSyncStorage.add(item, "Przekroczono maksymalną liczbę prób synchronizacji");
        await syncQueue.remove(item.id);
        failed++;
        pendingCount--;
        notifyListeners(true, pendingCount);
        // Notify about new failed item
        const failedItems = await failedSyncStorage.getAll();
        notifyFailedListeners(failedItems.length);
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

// Subscribe to failed sync count changes
export function onFailedSyncChange(
  callback: (count: number) => void
): () => void {
  failedListeners.push(callback);

  // Get initial failed count
  failedSyncStorage.getAll().then(items => {
    callback(items.length);
  });

  return () => {
    failedListeners = failedListeners.filter(l => l !== callback);
  };
}

// Get all failed sync items
export async function getFailedSyncItems(): Promise<FailedSyncItem[]> {
  return failedSyncStorage.getAll();
}

// Retry a specific failed sync item
export async function retryFailedSync(id: string): Promise<boolean> {
  const success = await failedSyncStorage.retry(id);
  if (success) {
    const failedItems = await failedSyncStorage.getAll();
    notifyFailedListeners(failedItems.length);
    // Trigger sync if online
    if (isOnline()) {
      setTimeout(() => processSync(), 100);
    }
  }
  return success;
}

// Retry all failed sync items
export async function retryAllFailedSync(): Promise<number> {
  const items = await failedSyncStorage.getAll();
  let retried = 0;

  for (const item of items) {
    const success = await failedSyncStorage.retry(item.id);
    if (success) retried++;
  }

  const remaining = await failedSyncStorage.getAll();
  notifyFailedListeners(remaining.length);

  // Trigger sync if online
  if (isOnline() && retried > 0) {
    setTimeout(() => processSync(), 100);
  }

  return retried;
}

// Discard a specific failed sync item
export async function discardFailedSync(id: string): Promise<boolean> {
  const success = await failedSyncStorage.remove(id);
  if (success) {
    const failedItems = await failedSyncStorage.getAll();
    notifyFailedListeners(failedItems.length);
  }
  return success;
}

// Discard all failed sync items
export async function discardAllFailedSync(): Promise<void> {
  await failedSyncStorage.clear();
  notifyFailedListeners(0);
}

// Get failed sync count
export async function getFailedSyncCount(): Promise<number> {
  const items = await failedSyncStorage.getAll();
  return items.length;
}
