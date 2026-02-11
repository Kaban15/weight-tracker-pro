"use client";

import { useState, useEffect } from "react";
import { Wifi, WifiOff, RefreshCw, CloudOff, Check } from "lucide-react";
import {
  isOnline,
  onOnlineStatusChange,
  initOfflineDB,
} from "@/lib/offlineStorage";
import {
  initSyncManager,
  onSyncStatusChange,
  processSync,
  getPendingSyncCount,
} from "@/lib/syncManager";

export default function OfflineIndicator() {
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [showBanner, setShowBanner] = useState(false);
  const [justSynced, setJustSynced] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    // Initialize offline storage and sync manager
    const init = async () => {
      await initOfflineDB();
      setOnline(isOnline());
      setInitialized(true);
    };

    init();

    // Listen for online/offline changes
    const unsubOnline = onOnlineStatusChange((isOnline) => {
      setOnline(isOnline);
      setShowBanner(true);

      // Hide banner after 3 seconds
      setTimeout(() => setShowBanner(false), 3000);
    });

    // Listen for sync status changes
    const unsubSync = onSyncStatusChange((isSyncing, pending) => {
      setSyncing(isSyncing);
      setPendingCount(pending);

      // Show "synced" indicator briefly
      if (!isSyncing && pending === 0) {
        setJustSynced(true);
        setTimeout(() => setJustSynced(false), 2000);
      }
    });

    // Initialize sync manager
    const unsubSyncManager = initSyncManager();

    // Get initial pending count
    getPendingSyncCount().then(setPendingCount);

    return () => {
      unsubOnline();
      unsubSync();
      unsubSyncManager();
    };
  }, []);

  const handleManualSync = async () => {
    if (online && !syncing) {
      await processSync();
    }
  };

  if (!initialized) return null;

  return (
    <>
      {/* Floating status indicator */}
      <div className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-[calc(1rem+env(safe-area-inset-right))] z-40 flex flex-col items-end gap-2">
        {/* Pending sync badge */}
        {pendingCount > 0 && (
          <button
            onClick={handleManualSync}
            disabled={!online || syncing}
            className={`flex items-center gap-2 px-3 py-2 min-h-[44px] rounded-full text-sm font-medium transition-all ${
              syncing
                ? "bg-blue-600 text-white"
                : online
                ? "bg-amber-600 hover:bg-amber-500 text-white cursor-pointer"
                : "bg-slate-700 text-slate-300"
            }`}
          >
            {syncing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Synchronizacja...</span>
              </>
            ) : (
              <>
                <CloudOff className="w-4 h-4" />
                <span>{pendingCount} do synchronizacji</span>
              </>
            )}
          </button>
        )}

        {/* Just synced indicator */}
        {justSynced && pendingCount === 0 && (
          <div className="flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-full text-sm font-medium animate-pulse">
            <Check className="w-4 h-4" />
            <span>Zsynchronizowano</span>
          </div>
        )}

        {/* Offline indicator (always visible when offline) */}
        {!online && (
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-800 border border-slate-700 text-slate-300 rounded-full text-sm">
            <WifiOff className="w-4 h-4 text-rose-400" />
            <span>Tryb offline</span>
          </div>
        )}
      </div>

      {/* Status change banner */}
      {showBanner && (
        <div
          className={`fixed top-0 left-0 right-0 z-50 py-2 px-4 pt-[calc(0.5rem+env(safe-area-inset-top))] text-center text-sm font-medium transition-all ${
            online
              ? "bg-emerald-600 text-white"
              : "bg-slate-800 text-slate-300 border-b border-slate-700"
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            {online ? (
              <>
                <Wifi className="w-4 h-4" />
                <span>Połączono z internetem</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 text-rose-400" />
                <span>Brak połączenia - dane będą zapisane lokalnie</span>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
