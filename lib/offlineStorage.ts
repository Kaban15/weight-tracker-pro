"use client";

// IndexedDB-based offline storage for Weight Tracker

const DB_NAME = "weight-tracker-offline";
const DB_VERSION = 2;

// Store names
const STORES = {
  ENTRIES: "entries",
  GOALS: "goals",
  SYNC_QUEUE: "syncQueue",
  FAILED_SYNC: "failedSync",
} as const;

export interface SyncQueueItem {
  id: string;
  operation: "create" | "update" | "delete";
  table: string;
  data: Record<string, unknown>;
  timestamp: number;
  retries: number;
}

export interface FailedSyncItem extends SyncQueueItem {
  failedAt: number;
  errorMessage?: string;
}

let db: IDBDatabase | null = null;

// Initialize IndexedDB
export async function initOfflineDB(): Promise<boolean> {
  if (typeof window === "undefined" || !window.indexedDB) {
    return false;
  }

  return new Promise((resolve) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.warn("IndexedDB not available");
      resolve(false);
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(true);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      // Entries store
      if (!database.objectStoreNames.contains(STORES.ENTRIES)) {
        const entriesStore = database.createObjectStore(STORES.ENTRIES, { keyPath: "id" });
        entriesStore.createIndex("user_id", "user_id", { unique: false });
        entriesStore.createIndex("date", "date", { unique: false });
      }

      // Goals store
      if (!database.objectStoreNames.contains(STORES.GOALS)) {
        const goalsStore = database.createObjectStore(STORES.GOALS, { keyPath: "id" });
        goalsStore.createIndex("user_id", "user_id", { unique: false });
      }

      // Sync queue store
      if (!database.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        const syncStore = database.createObjectStore(STORES.SYNC_QUEUE, { keyPath: "id" });
        syncStore.createIndex("timestamp", "timestamp", { unique: false });
      }

      // Failed sync store
      if (!database.objectStoreNames.contains(STORES.FAILED_SYNC)) {
        const failedStore = database.createObjectStore(STORES.FAILED_SYNC, { keyPath: "id" });
        failedStore.createIndex("failedAt", "failedAt", { unique: false });
      }
    };
  });
}

// Generic get all from store
async function getAllFromStore<T>(storeName: string, userId?: string): Promise<T[]> {
  if (!db) return [];

  return new Promise((resolve) => {
    try {
      const transaction = db!.transaction(storeName, "readonly");
      const store = transaction.objectStore(storeName);

      if (userId) {
        const index = store.index("user_id");
        const request = index.getAll(userId);
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => resolve([]);
      } else {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => resolve([]);
      }
    } catch {
      resolve([]);
    }
  });
}

// Generic put to store
async function putToStore<T extends { id: string }>(storeName: string, data: T): Promise<boolean> {
  if (!db) return false;

  return new Promise((resolve) => {
    try {
      const transaction = db!.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.put(data);
      request.onsuccess = () => resolve(true);
      request.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

// Generic delete from store
async function deleteFromStore(storeName: string, id: string): Promise<boolean> {
  if (!db) return false;

  return new Promise((resolve) => {
    try {
      const transaction = db!.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);
      request.onsuccess = () => resolve(true);
      request.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

// Clear store
async function clearStore(storeName: string): Promise<boolean> {
  if (!db) return false;

  return new Promise((resolve) => {
    try {
      const transaction = db!.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.clear();
      request.onsuccess = () => resolve(true);
      request.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

// Entries operations
export const entriesStorage = {
  getAll: (userId: string) => getAllFromStore<Record<string, unknown>>(STORES.ENTRIES, userId),
  save: (entry: Record<string, unknown> & { id: string }) => putToStore(STORES.ENTRIES, entry),
  delete: (id: string) => deleteFromStore(STORES.ENTRIES, id),
  clear: () => clearStore(STORES.ENTRIES),

  // Bulk save for initial sync
  async saveAll(entries: Array<Record<string, unknown> & { id: string }>): Promise<boolean> {
    if (!db) return false;

    return new Promise((resolve) => {
      try {
        const transaction = db!.transaction(STORES.ENTRIES, "readwrite");
        const store = transaction.objectStore(STORES.ENTRIES);

        entries.forEach(entry => store.put(entry));

        transaction.oncomplete = () => resolve(true);
        transaction.onerror = () => resolve(false);
      } catch {
        resolve(false);
      }
    });
  }
};

// Goals operations
export const goalsStorage = {
  get: async (userId: string): Promise<Record<string, unknown> | null> => {
    const goals = await getAllFromStore<Record<string, unknown>>(STORES.GOALS, userId);
    return goals[0] || null;
  },
  save: (goal: Record<string, unknown> & { id: string }) => putToStore(STORES.GOALS, goal),
  delete: (id: string) => deleteFromStore(STORES.GOALS, id),
};

// Sync queue operations
export const syncQueue = {
  getAll: () => getAllFromStore<SyncQueueItem>(STORES.SYNC_QUEUE),

  add: async (item: Omit<SyncQueueItem, "id" | "timestamp" | "retries">): Promise<boolean> => {
    const queueItem: SyncQueueItem = {
      ...item,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      retries: 0,
    };
    return putToStore(STORES.SYNC_QUEUE, queueItem);
  },

  remove: (id: string) => deleteFromStore(STORES.SYNC_QUEUE, id),

  incrementRetry: async (id: string): Promise<boolean> => {
    if (!db) return false;

    return new Promise((resolve) => {
      try {
        const transaction = db!.transaction(STORES.SYNC_QUEUE, "readwrite");
        const store = transaction.objectStore(STORES.SYNC_QUEUE);
        const getRequest = store.get(id);

        getRequest.onsuccess = () => {
          const item = getRequest.result as SyncQueueItem;
          if (item) {
            item.retries++;
            store.put(item);
            resolve(true);
          } else {
            resolve(false);
          }
        };
        getRequest.onerror = () => resolve(false);
      } catch {
        resolve(false);
      }
    });
  },

  clear: () => clearStore(STORES.SYNC_QUEUE),
};

// Failed sync operations
export const failedSyncStorage = {
  getAll: () => getAllFromStore<FailedSyncItem>(STORES.FAILED_SYNC),

  add: async (item: SyncQueueItem, errorMessage?: string): Promise<boolean> => {
    const failedItem: FailedSyncItem = {
      ...item,
      failedAt: Date.now(),
      errorMessage,
    };
    return putToStore(STORES.FAILED_SYNC, failedItem);
  },

  remove: (id: string) => deleteFromStore(STORES.FAILED_SYNC, id),

  // Move item back to sync queue for retry
  retry: async (id: string): Promise<boolean> => {
    if (!db) return false;

    return new Promise((resolve) => {
      try {
        const transaction = db!.transaction([STORES.FAILED_SYNC, STORES.SYNC_QUEUE], "readwrite");
        const failedStore = transaction.objectStore(STORES.FAILED_SYNC);
        const syncStore = transaction.objectStore(STORES.SYNC_QUEUE);

        const getRequest = failedStore.get(id);

        getRequest.onsuccess = () => {
          const item = getRequest.result as FailedSyncItem;
          if (item) {
            // Create new sync item with reset retries
            const syncItem: SyncQueueItem = {
              id: crypto.randomUUID(),
              operation: item.operation,
              table: item.table,
              data: item.data,
              timestamp: Date.now(),
              retries: 0,
            };
            syncStore.add(syncItem);
            failedStore.delete(id);
            resolve(true);
          } else {
            resolve(false);
          }
        };
        getRequest.onerror = () => resolve(false);
      } catch {
        resolve(false);
      }
    });
  },

  clear: () => clearStore(STORES.FAILED_SYNC),
};

// Check if we're online
export function isOnline(): boolean {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}

// Listen for online/offline events
export function onOnlineStatusChange(callback: (online: boolean) => void): () => void {
  if (typeof window === "undefined") return () => {};

  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
  };
}
