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
            ? "bg-blue-600/20 text-blue-400 border border-blue-500/30"
            : "bg-[var(--card-bg)] text-[var(--muted)] hover:text-[var(--foreground)] border border-[var(--card-border)]"
        }`}
      >
        <Filter className="w-4 h-4" />
        <span>Filtry</span>
        {hasActiveFilters && (
          <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
            {activeCount}
          </span>
        )}
        <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? "rotate-180" : ""}`} />
      </button>

      {showFilters && (
        <div className="mt-3 bg-[var(--card-bg)] rounded-xl p-4 border border-[var(--card-border)] space-y-4">
          {/* Priority Filter */}
          <div>
            <label className="block text-sm text-[var(--muted)] mb-2">Priorytet</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onPriorityChange("all")}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  priorityFilter === "all"
                    ? "bg-blue-600 text-[var(--foreground)]"
                    : "bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface)]"
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
                      ? "bg-blue-600 text-[var(--foreground)]"
                      : "bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface)]"
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
            <label className="block text-sm text-[var(--muted)] mb-2">Status</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onStatusChange("all")}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  statusFilter === "all"
                    ? "bg-blue-600 text-[var(--foreground)]"
                    : "bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface)]"
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
                      ? "bg-blue-600 text-[var(--foreground)]"
                      : "bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface)]"
                  }`}
                >
                  {STATUS_CONFIG[s].label}
                </button>
              ))}
            </div>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-sm text-[var(--muted)] mb-2">Kategoria</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onCategoryChange("all")}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  categoryFilter === "all"
                    ? "bg-blue-600 text-[var(--foreground)]"
                    : "bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface)]"
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
                      ? "bg-blue-600 text-[var(--foreground)]"
                      : "bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface)]"
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
              className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1"
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
