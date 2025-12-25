"use client";

import { Cloud, CloudOff, Loader2 } from "lucide-react";

interface SyncIndicatorProps {
  isSyncing: boolean;
  syncError: string | null;
}

export default function SyncIndicator({ isSyncing, syncError }: SyncIndicatorProps) {
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
