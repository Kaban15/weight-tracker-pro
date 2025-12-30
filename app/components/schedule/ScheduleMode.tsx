"use client";

import { useState } from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Check,
  Plus,
  Trash2,
  ListChecks,
  Target,
  Calendar,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import SyncIndicator from "../shared/SyncIndicator";
import { useSchedule } from "./useSchedule";
import { ScheduleItem } from "./types";
import { PRIORITY_CONFIG, CATEGORY_CONFIG } from "../todo/types";

interface ScheduleModeProps {
  onBack: () => void;
}

// Progress ring component
function ProgressRing({ percentage, size = 60 }: { percentage: number; size?: number }) {
  const strokeWidth = size * 0.1;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  const getColor = () => {
    if (percentage === 100) return '#10b981';
    if (percentage >= 50) return '#06b6d4';
    if (percentage > 0) return '#f59e0b';
    return '#475569';
  };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(100, 116, 139, 0.3)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getColor()}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold text-white">{percentage}%</span>
      </div>
    </div>
  );
}

// Schedule item row component
function ScheduleItemRow({
  item,
  onToggle,
  onDelete,
}: {
  item: ScheduleItem;
  onToggle: () => void;
  onDelete?: () => void;
}) {
  const getTypeIcon = () => {
    switch (item.type) {
      case 'todo':
        return <ListChecks className="w-4 h-4 text-rose-400" />;
      case 'challenge':
        return <Target className="w-4 h-4 text-amber-400" />;
      default:
        return <Calendar className="w-4 h-4 text-cyan-400" />;
    }
  };

  const getTypeColor = () => {
    switch (item.type) {
      case 'todo':
        return 'border-rose-500/30 bg-rose-500/5';
      case 'challenge':
        return 'border-amber-500/30 bg-amber-500/5';
      default:
        return 'border-cyan-500/30 bg-cyan-500/5';
    }
  };

  const priorityConfig = item.priority ? PRIORITY_CONFIG[item.priority] : null;
  const categoryConfig = item.category ? CATEGORY_CONFIG[item.category as keyof typeof CATEGORY_CONFIG] : null;

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-xl border ${getTypeColor()} transition-all hover:bg-slate-800/50 group`}
    >
      {/* Checkbox */}
      <button
        onClick={onToggle}
        className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
          item.completed
            ? 'bg-emerald-500 text-white'
            : 'border-2 border-slate-500 hover:border-cyan-400'
        }`}
      >
        {item.completed && <Check className="w-4 h-4" />}
      </button>

      {/* Type icon */}
      <div className="flex-shrink-0">{getTypeIcon()}</div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className={`font-medium ${item.completed ? 'text-slate-500 line-through' : 'text-white'}`}>
          {item.title}
        </div>

        {/* Extra info */}
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {/* Priority badge for todos */}
          {priorityConfig && (
            <span className={`text-xs px-1.5 py-0.5 rounded ${priorityConfig.bgColor}/20 ${priorityConfig.color}`}>
              {priorityConfig.label}
            </span>
          )}

          {/* Category badge for todos */}
          {categoryConfig && (
            <span className="text-xs text-slate-400">
              {categoryConfig.label}
            </span>
          )}

          {/* Reps info for challenges */}
          {item.type === 'challenge' && item.trackReps && (
            <span className="text-xs text-slate-400">
              {item.reps || 0}{item.goalReps ? `/${item.goalReps}` : ''} {item.goalUnit || 'powtórzeń'}
            </span>
          )}

          {/* Notes preview for todos */}
          {item.notes && (
            <span className="text-xs text-slate-500 truncate max-w-[150px]">
              {item.notes}
            </span>
          )}
        </div>
      </div>

      {/* Delete button for custom items */}
      {item.type === 'custom' && onDelete && (
        <button
          onClick={onDelete}
          className="p-1.5 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

// Section component
function ScheduleSection({
  title,
  icon,
  items,
  color,
  onToggle,
  onDelete,
}: {
  title: string;
  icon: React.ReactNode;
  items: ScheduleItem[];
  color: string;
  onToggle: (item: ScheduleItem) => void;
  onDelete?: (item: ScheduleItem) => void;
}) {
  if (items.length === 0) return null;

  const completed = items.filter(i => i.completed).length;

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <div className={`p-1.5 rounded-lg ${color}`}>{icon}</div>
        <h3 className="font-semibold text-white">{title}</h3>
        <span className="text-sm text-slate-400">
          {completed}/{items.length}
        </span>
      </div>
      <div className="space-y-2">
        {items.map(item => (
          <ScheduleItemRow
            key={item.id}
            item={item}
            onToggle={() => onToggle(item)}
            onDelete={onDelete ? () => onDelete(item) : undefined}
          />
        ))}
      </div>
    </div>
  );
}

export default function ScheduleMode({ onBack }: ScheduleModeProps) {
  const { user, signOut } = useAuth();
  const {
    selectedDate,
    items,
    todoItems,
    challengeItems,
    customItems,
    stats,
    isLoading,
    isSyncing,
    syncError,
    toggleItem,
    addCustomItem,
    deleteCustomItem,
    goToPreviousDay,
    goToNextDay,
    goToToday,
    isToday,
  } = useSchedule(user?.id);

  const [newItemTitle, setNewItemTitle] = useState('');
  const [showAddInput, setShowAddInput] = useState(false);

  const handleAddItem = async () => {
    if (!newItemTitle.trim()) return;
    await addCustomItem(newItemTitle);
    setNewItemTitle('');
    setShowAddInput(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddItem();
    }
    if (e.key === 'Escape') {
      setShowAddInput(false);
      setNewItemTitle('');
    }
  };

  // Format date for display
  const dateObj = new Date(selectedDate);
  const dayName = dateObj.toLocaleDateString('pl-PL', { weekday: 'long' });
  const dayNumber = dateObj.getDate();
  const monthName = dateObj.toLocaleDateString('pl-PL', { month: 'long' });

  const percentage = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-cyan-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Ładowanie harmonogramu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950">
      {/* Header */}
      <header className="bg-slate-900/50 border-b border-slate-800">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Powrót</span>
          </button>
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-cyan-400" />
            <h1 className="text-xl font-bold text-white">Harmonogram</h1>
            <SyncIndicator isSyncing={isSyncing} syncError={syncError} />
          </div>
          <button
            onClick={signOut}
            className="text-slate-400 hover:text-white transition-colors text-sm"
          >
            Wyloguj
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Date Navigation */}
        <div className="bg-slate-800/40 backdrop-blur rounded-2xl border border-slate-700/50 p-5 mb-6">
          <div className="flex items-center justify-between">
            {/* Navigation */}
            <div className="flex items-center gap-3">
              <button
                onClick={goToPreviousDay}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-xl transition-all"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div className="text-center min-w-[180px]">
                <div className="text-2xl font-bold text-white">
                  {dayNumber} {monthName}
                </div>
                <div className={`text-sm capitalize ${isToday ? 'text-cyan-400 font-medium' : 'text-slate-400'}`}>
                  {isToday ? 'Dzisiaj' : dayName}
                </div>
              </div>

              <button
                onClick={goToNextDay}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-xl transition-all"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-6">
              {!isToday && (
                <button
                  onClick={goToToday}
                  className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  Wróć do dziś
                </button>
              )}

              <div className="flex items-center gap-4">
                <ProgressRing percentage={percentage} />
                <div>
                  <div className="text-2xl font-bold text-white">
                    {stats.completed}<span className="text-slate-500">/{stats.total}</span>
                  </div>
                  <div className="text-xs text-slate-500">wykonano</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        {items.length === 0 ? (
          <div className="bg-slate-800/40 rounded-2xl border border-slate-700/50 p-8 text-center">
            <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Brak zaplanowanych rzeczy</h3>
            <p className="text-slate-400 mb-4">
              Na ten dzień nie masz zadań, nawyków ani własnych wpisów.
            </p>
            <button
              onClick={() => setShowAddInput(true)}
              className="inline-flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Dodaj wpis
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Todo Section */}
            <ScheduleSection
              title="Zadania"
              icon={<ListChecks className="w-4 h-4 text-rose-400" />}
              items={todoItems}
              color="bg-rose-500/20"
              onToggle={toggleItem}
            />

            {/* Challenge Section */}
            <ScheduleSection
              title="Nawyki"
              icon={<Target className="w-4 h-4 text-amber-400" />}
              items={challengeItems}
              color="bg-amber-500/20"
              onToggle={toggleItem}
            />

            {/* Custom Section */}
            <ScheduleSection
              title="Inne"
              icon={<Calendar className="w-4 h-4 text-cyan-400" />}
              items={customItems}
              color="bg-cyan-500/20"
              onToggle={toggleItem}
              onDelete={(item) => deleteCustomItem(item.id)}
            />
          </div>
        )}

        {/* Add Custom Item */}
        <div className="mt-6">
          {showAddInput ? (
            <div className="bg-slate-800/40 rounded-xl border border-slate-700/50 p-4">
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={newItemTitle}
                  onChange={(e) => setNewItemTitle(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Dodaj własny wpis..."
                  className="flex-1 bg-slate-900 border-2 border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                  autoFocus
                />
                <button
                  onClick={handleAddItem}
                  disabled={!newItemTitle.trim()}
                  className="bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-600 text-white p-2 rounded-lg transition-colors"
                >
                  <Check className="w-5 h-5" />
                </button>
                <button
                  onClick={() => {
                    setShowAddInput(false);
                    setNewItemTitle('');
                  }}
                  className="text-slate-400 hover:text-white p-2"
                >
                  Anuluj
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddInput(true)}
              className="w-full flex items-center justify-center gap-2 bg-slate-800/40 hover:bg-slate-800/60 border border-slate-700/50 hover:border-cyan-500/50 text-slate-400 hover:text-cyan-400 py-3 rounded-xl transition-all"
            >
              <Plus className="w-5 h-5" />
              Dodaj własny wpis
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
