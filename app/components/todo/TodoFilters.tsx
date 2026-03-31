"use client";

import { Filter, ChevronDown, X } from "lucide-react";
import {
  PRIORITY_CONFIG,
  STATUS_CONFIG,
  CATEGORY_CONFIG,
  Priority,
  TaskStatus,
  Category,
} from "./types";

interface TodoFiltersProps {
  priorityFilter: Priority | "all";
  statusFilter: TaskStatus | "all";
  categoryFilter: Category | "all";
  showFilters: boolean;
  hasActiveFilters: boolean;
  onPriorityChange: (value: Priority | "all") => void;
  onStatusChange: (value: TaskStatus | "all") => void;
  onCategoryChange: (value: Category | "all") => void;
  onToggleFilters: () => void;
  onClearFilters: () => void;
}

export default function TodoFilters({
  priorityFilter,
  statusFilter,
  categoryFilter,
  showFilters,
  hasActiveFilters,
  onPriorityChange,
  onStatusChange,
  onCategoryChange,
  onToggleFilters,
  onClearFilters,
}: TodoFiltersProps) {
  const activeCount = [
    priorityFilter !== "all",
    statusFilter !== "all",
    categoryFilter !== "all",
  ].filter(Boolean).length;

  return (
    <div className="mb-4">
      <button
        onClick={onToggleFilters}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
          hasActiveFilters
            ? "bg-rose-600/20 text-rose-400 border border-rose-500/30"
            : "bg-slate-800/50 text-slate-400 hover:text-white border border-slate-700"
        }`}
      >
        <Filter className="w-4 h-4" />
        <span>Filtry</span>
        {hasActiveFilters && (
          <span className="bg-rose-600 text-white text-xs px-2 py-0.5 rounded-full">
            {activeCount}
          </span>
        )}
        <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? "rotate-180" : ""}`} />
      </button>

      {showFilters && (
        <div className="mt-3 bg-slate-800/50 rounded-xl p-4 border border-slate-700 space-y-4">
          {/* Priority Filter */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">Priorytet</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onPriorityChange("all")}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  priorityFilter === "all"
                    ? "bg-rose-600 text-white"
                    : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                }`}
              >
                Wszystkie
              </button>
              {(Object.keys(PRIORITY_CONFIG) as Priority[]).map((p) => (
                <button
                  key={p}
                  onClick={() => onPriorityChange(p)}
                  className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition-colors ${
                    priorityFilter === p
                      ? "bg-rose-600 text-white"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${PRIORITY_CONFIG[p].bgColor}`} />
                  {PRIORITY_CONFIG[p].label}
                </button>
              ))}
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">Status</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onStatusChange("all")}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  statusFilter === "all"
                    ? "bg-rose-600 text-white"
                    : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                }`}
              >
                Wszystkie
              </button>
              {(Object.keys(STATUS_CONFIG) as TaskStatus[]).map((s) => (
                <button
                  key={s}
                  onClick={() => onStatusChange(s)}
                  className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition-colors ${
                    statusFilter === s
                      ? "bg-rose-600 text-white"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  {STATUS_CONFIG[s].label}
                </button>
              ))}
            </div>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">Kategoria</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onCategoryChange("all")}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  categoryFilter === "all"
                    ? "bg-rose-600 text-white"
                    : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                }`}
              >
                Wszystkie
              </button>
              {(Object.keys(CATEGORY_CONFIG) as Category[]).map((c) => (
                <button
                  key={c}
                  onClick={() => onCategoryChange(c)}
                  className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition-colors ${
                    categoryFilter === c
                      ? "bg-rose-600 text-white"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  <span>{CATEGORY_CONFIG[c].emoji}</span>
                  {CATEGORY_CONFIG[c].label}
                </button>
              ))}
            </div>
          </div>

          {hasActiveFilters && (
            <button
              onClick={onClearFilters}
              className="text-rose-400 hover:text-rose-300 text-sm flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              Wyczyść filtry
            </button>
          )}
        </div>
      )}
    </div>
  );
}
