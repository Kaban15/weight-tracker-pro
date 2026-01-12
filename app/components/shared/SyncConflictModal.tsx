"use client";

import { useState, useEffect, useCallback } from "react";
import { X, RefreshCw, Trash2, AlertTriangle, Clock, Database, ChevronDown, ChevronUp } from "lucide-react";
import { FailedSyncItem } from "@/lib/offlineStorage";
import {
  getFailedSyncItems,
  retryFailedSync,
  retryAllFailedSync,
  discardFailedSync,
  discardAllFailedSync,
  onFailedSyncChange,
} from "@/lib/syncManager";

interface SyncConflictModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TABLE_LABELS: Record<string, string> = {
  weight_entries: "Wpis wagi",
  goals: "Cel",
  challenges: "Wyzwanie",
  challenge_entries: "Wpis wyzwania",
  tasks: "Zadanie",
  user_profiles: "Profil",
  body_measurements: "Pomiary ciała",
};

const OPERATION_LABELS: Record<string, string> = {
  create: "Dodanie",
  update: "Aktualizacja",
  delete: "Usunięcie",
};

export default function SyncConflictModal({ isOpen, onClose }: SyncConflictModalProps) {
  const [items, setItems] = useState<FailedSyncItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const loadItems = useCallback(async () => {
    const failedItems = await getFailedSyncItems();
    setItems(failedItems.sort((a, b) => b.failedAt - a.failedAt));
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadItems();
    }
  }, [isOpen, loadItems]);

  useEffect(() => {
    const unsubscribe = onFailedSyncChange(() => {
      if (isOpen) {
        loadItems();
      }
    });
    return unsubscribe;
  }, [isOpen, loadItems]);

  const handleRetry = async (id: string) => {
    setRetrying(id);
    await retryFailedSync(id);
    setRetrying(null);
  };

  const handleRetryAll = async () => {
    setLoading(true);
    await retryAllFailedSync();
    setLoading(false);
  };

  const handleDiscard = async (id: string) => {
    await discardFailedSync(id);
  };

  const handleDiscardAll = async () => {
    if (confirm("Czy na pewno chcesz odrzucić wszystkie nieudane synchronizacje? Dane zostaną utracone.")) {
      setLoading(true);
      await discardAllFailedSync();
      setLoading(false);
      onClose();
    }
  };

  const toggleExpanded = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString("pl-PL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getDataPreview = (data: Record<string, unknown>): string => {
    if (data.date) return `Data: ${data.date}`;
    if (data.name) return `Nazwa: ${data.name}`;
    if (data.title) return `Tytuł: ${data.title}`;
    if (data.weight) return `Waga: ${data.weight} kg`;
    return `ID: ${String(data.id || "").substring(0, 8)}...`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Problemy z synchronizacją
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Database className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Brak problemów z synchronizacją</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Poniższe elementy nie mogły zostać zsynchronizowane z serwerem.
                Możesz spróbować ponownie lub odrzucić zmiany.
              </p>

              {items.map((item) => (
                <div
                  key={item.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
                >
                  <div
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 cursor-pointer"
                    onClick={() => toggleExpanded(item.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
                        <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded text-xs">
                          {OPERATION_LABELS[item.operation] || item.operation}
                        </span>
                        <span>{TABLE_LABELS[item.table] || item.table}</span>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(item.failedAt)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRetry(item.id);
                        }}
                        disabled={retrying === item.id || loading}
                        className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors disabled:opacity-50"
                        title="Ponów"
                      >
                        <RefreshCw className={`w-4 h-4 ${retrying === item.id ? "animate-spin" : ""}`} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDiscard(item.id);
                        }}
                        disabled={loading}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                        title="Odrzuć"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      {expandedItems.has(item.id) ? (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  </div>

                  {expandedItems.has(item.id) && (
                    <div className="p-3 text-sm border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                      <div className="text-gray-600 dark:text-gray-400 mb-2">
                        {getDataPreview(item.data)}
                      </div>
                      {item.errorMessage && (
                        <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                          {item.errorMessage}
                        </div>
                      )}
                      <div className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                        Próby: {item.retries} | Utworzono: {formatDate(item.timestamp)}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="flex gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleRetryAll}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Ponów wszystkie ({items.length})
            </button>
            <button
              onClick={handleDiscardAll}
              disabled={loading}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              Odrzuć
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
