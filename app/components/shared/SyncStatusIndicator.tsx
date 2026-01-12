"use client";

import { useState, useEffect } from "react";
import { Cloud, CloudOff, AlertCircle, Loader2 } from "lucide-react";
import { onSyncStatusChange, onFailedSyncChange } from "@/lib/syncManager";
import { isOnline, onOnlineStatusChange } from "@/lib/offlineStorage";
import SyncConflictModal from "./SyncConflictModal";

export default function SyncStatusIndicator() {
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [pending, setPending] = useState(0);
  const [failed, setFailed] = useState(0);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // Check initial online status
    setOnline(isOnline());

    // Listen for online/offline changes
    const unsubOnline = onOnlineStatusChange(setOnline);

    // Listen for sync status changes
    const unsubSync = onSyncStatusChange((isSyncing, pendingCount) => {
      setSyncing(isSyncing);
      setPending(pendingCount);
    });

    // Listen for failed sync changes
    const unsubFailed = onFailedSyncChange(setFailed);

    return () => {
      unsubOnline();
      unsubSync();
      unsubFailed();
    };
  }, []);

  // Don't show anything if everything is fine
  if (online && !syncing && pending === 0 && failed === 0) {
    return null;
  }

  return (
    <>
      <button
        onClick={() => failed > 0 && setShowModal(true)}
        className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
          failed > 0
            ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50 cursor-pointer"
            : !online
            ? "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
            : syncing
            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
            : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
        }`}
        disabled={failed === 0}
      >
        {failed > 0 ? (
          <>
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{failed} błąd{failed === 1 ? "" : failed < 5 ? "y" : "ów"}</span>
          </>
        ) : !online ? (
          <>
            <CloudOff className="w-3.5 h-3.5" />
            <span>Offline</span>
            {pending > 0 && <span className="ml-1">({pending})</span>}
          </>
        ) : syncing ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Synchronizacja...</span>
          </>
        ) : (
          <>
            <Cloud className="w-3.5 h-3.5" />
            <span>{pending} oczekuje</span>
          </>
        )}
      </button>

      <SyncConflictModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      />
    </>
  );
}
