"use client";

import { useState, useEffect } from "react";
import { Cloud, CloudOff, Loader2, AlertCircle } from "lucide-react";
import { onFailedSyncChange } from "@/lib/syncManager";
import SyncConflictModal from "./SyncConflictModal";

interface SyncIndicatorProps {
  isSyncing: boolean;
  syncError: string | null;
}

export default function SyncIndicator({ isSyncing, syncError }: SyncIndicatorProps) {
  const [failedCount, setFailedCount] = useState(0);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const unsubscribe = onFailedSyncChange(setFailedCount);
    return unsubscribe;
  }, []);

  // Show failed sync indicator with count
  if (failedCount > 0) {
    return (
      <>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1 text-amber-400 hover:text-amber-300 transition-colors"
          title={`${failedCount} nieudanych synchronizacji`}
        >
          <AlertCircle className="w-4 h-4" />
          <span className="text-xs font-medium">{failedCount}</span>
        </button>
        <SyncConflictModal isOpen={showModal} onClose={() => setShowModal(false)} />
      </>
    );
  }

  if (isSyncing) {
    return <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />;
  }

  if (syncError) {
    return (
      <span title={syncError}>
        <CloudOff className="w-4 h-4 text-rose-400" />
      </span>
    );
  }

  return <Cloud className="w-4 h-4 text-emerald-400" />;
}
