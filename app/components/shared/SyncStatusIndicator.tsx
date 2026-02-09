"use client";

import { useState, useEffect, useCallback } from "react";
import { Cloud, CloudOff, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
import { onSyncStatusChange, onFailedSyncChange } from "@/lib/syncManager";
import { isOnline, onOnlineStatusChange } from "@/lib/offlineStorage";
import SyncConflictModal from "./SyncConflictModal";

export default function SyncStatusIndicator() {
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [pending, setPending] = useState(0);
  const [failed, setFailed] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [prevPending, setPrevPending] = useState(0);

  useEffect(() => {
    // Check initial online status
    setOnline(isOnline());

    // Listen for online/offline changes
    const unsubOnline = onOnlineStatusChange(setOnline);

    // Listen for sync status changes
    const unsubSync = onSyncStatusChange((isSyncing, pendingCount) => {
      setSyncing(isSyncing);
      setPrevPending((prev) => {
        // Show "saved" flash when pending drops to 0 from > 0
        if (prev > 0 && pendingCount === 0 && !isSyncing) {
          setShowSaved(true);
        }
        return pendingCount;
      });
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

  // Auto-hide "saved" after 3s
  useEffect(() => {
    if (!showSaved) return;
    const timer = setTimeout(() => setShowSaved(false), 3000);
    return () => clearTimeout(timer);
  }, [showSaved]);

  // Prevent data loss — warn before closing with pending sync
  const handleBeforeUnload = useCallback(
    (e: BeforeUnloadEvent) => {
      if (pending > 0 || syncing) {
        e.preventDefault();
      }
    },
    [pending, syncing]
  );

  useEffect(() => {
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [handleBeforeUnload]);

  // Show brief "saved" state
  if (showSaved && online && !syncing && pending === 0 && failed === 0) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-900/30 text-emerald-400 border border-emerald-500/20">
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span>Zapisano</span>
      </div>
    );
  }

  // Don't show anything if everything is fine
  if (online && !syncing && pending === 0 && failed === 0) {
    return null;
  }

  return (
    <>
      <button
        onClick={() => failed > 0 && setShowModal(true)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border ${
          failed > 0
            ? "bg-red-900/40 text-red-400 border-red-500/30 hover:bg-red-900/60 cursor-pointer animate-pulse"
            : !online
            ? "bg-red-900/30 text-red-300 border-red-500/20"
            : syncing
            ? "bg-blue-900/30 text-blue-400 border-blue-500/20"
            : "bg-amber-900/30 text-amber-400 border-amber-500/20"
        }`}
        disabled={failed === 0}
      >
        {failed > 0 ? (
          <>
            <AlertCircle className="w-4 h-4" />
            <span>{failed} błąd{failed === 1 ? "" : failed < 5 ? "y" : "ów"} sync</span>
          </>
        ) : !online ? (
          <>
            <CloudOff className="w-4 h-4" />
            <span>OFFLINE</span>
            {pending > 0 && <span className="ml-1 bg-red-500/30 px-1.5 py-0.5 rounded">{pending} zmian</span>}
          </>
        ) : syncing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Zapisywanie...</span>
            {pending > 0 && <span className="ml-1">({pending})</span>}
          </>
        ) : (
          <>
            <Cloud className="w-4 h-4" />
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
