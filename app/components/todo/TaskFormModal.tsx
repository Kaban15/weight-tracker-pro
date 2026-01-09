"use client";

import { useState, useEffect } from "react";
import { X, FileText, Clock } from "lucide-react";
import {
  Task,
  TaskFormData,
  DEFAULT_TASK_FORM,
  PRIORITY_CONFIG,
  STATUS_CONFIG,
  CATEGORY_CONFIG,
  DURATION_OPTIONS,
  Priority,
  TaskStatus,
  Category,
} from "./types";

interface TaskFormModalProps {
  isOpen: boolean;
  task?: Task | null;
  onSave: (data: TaskFormData) => void;
  onClose: () => void;
  defaultDate?: string;
}

export default function TaskFormModal({
  isOpen,
  task,
  onSave,
  onClose,
  defaultDate,
}: TaskFormModalProps) {
  const [formData, setFormData] = useState<TaskFormData>(DEFAULT_TASK_FORM);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title,
        notes: task.notes || '',
        deadline: task.deadline,
        priority: task.priority,
        status: task.status,
        category: task.category,
        duration: task.duration,
        time: task.time,
      });
    } else {
      setFormData({
        ...DEFAULT_TASK_FORM,
        deadline: defaultDate || new Date().toISOString().split('T')[0],
      });
    }
    setError(null);
  }, [task, isOpen, defaultDate]);

  const handleSubmit = () => {
    if (!formData.title.trim()) {
      setError("Podaj nazwę zadania");
      return;
    }
    if (!formData.deadline) {
      setError("Wybierz termin");
      return;
    }
    setError(null);
    onSave(formData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-xl border-2 border-slate-700 p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">
            {task ? "Edytuj zadanie" : "Nowe zadanie"}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">
              Nazwa zadania *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => {
                setFormData({ ...formData, title: e.target.value });
                setError(null);
              }}
              placeholder="np. Dokończyć raport"
              className="w-full bg-slate-900 border-2 border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm text-slate-400 mb-2 flex items-center gap-1.5">
              <FileText className="w-4 h-4" />
              Notatki
            </label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Dodatkowe informacje..."
              rows={3}
              className="w-full bg-slate-900 border-2 border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none resize-none"
            />
          </div>

          {/* Deadline */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">
              Termin *
            </label>
            <input
              type="date"
              value={formData.deadline}
              onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
              className="w-full bg-slate-900 border-2 border-slate-700 rounded-lg px-4 py-2 text-white focus:border-rose-500 focus:outline-none"
            />
          </div>

          {/* Time and Duration */}
          <div className="grid grid-cols-2 gap-3">
            {/* Time */}
            <div>
              <label className="block text-sm text-slate-400 mb-2 flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                Godzina
              </label>
              <input
                type="time"
                value={formData.time || ''}
                onChange={(e) => setFormData({ ...formData, time: e.target.value || undefined })}
                className="w-full bg-slate-900 border-2 border-slate-700 rounded-lg px-4 py-2 text-white focus:border-rose-500 focus:outline-none"
              />
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm text-slate-400 mb-2">
                Czas trwania
              </label>
              <select
                value={formData.duration || ''}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value ? Number(e.target.value) : undefined })}
                className="w-full bg-slate-900 border-2 border-slate-700 rounded-lg px-4 py-2 text-white focus:border-rose-500 focus:outline-none"
              >
                <option value="">Brak</option>
                {DURATION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">Priorytet</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(PRIORITY_CONFIG) as Priority[]).map((priority) => (
                <button
                  key={priority}
                  onClick={() => setFormData({ ...formData, priority })}
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                    formData.priority === priority
                      ? "bg-rose-600 text-white"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  <span className={`w-3 h-3 rounded-full ${PRIORITY_CONFIG[priority].bgColor}`} />
                  {PRIORITY_CONFIG[priority].label}
                </button>
              ))}
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">Status</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(STATUS_CONFIG) as TaskStatus[]).map((status) => (
                <button
                  key={status}
                  onClick={() => setFormData({ ...formData, status })}
                  className={`py-2 px-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1 ${
                    formData.status === status
                      ? status === 'cancelled'
                        ? "bg-red-600 text-white"
                        : "bg-rose-600 text-white"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  {status === 'cancelled' && <X className="w-3 h-3" />}
                  {STATUS_CONFIG[status].label}
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">Kategoria</label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(CATEGORY_CONFIG) as Category[]).map((category) => (
                <button
                  key={category}
                  onClick={() => setFormData({ ...formData, category })}
                  className={`py-2 px-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1 ${
                    formData.category === category
                      ? "bg-rose-600 text-white"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  <span>{CATEGORY_CONFIG[category].emoji}</span>
                  <span className="truncate text-xs">{CATEGORY_CONFIG[category].label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && <p className="text-red-400 text-sm">{error}</p>}

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg"
            >
              Anuluj
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 bg-rose-600 hover:bg-rose-500 text-white py-2 rounded-lg font-semibold"
            >
              {task ? "Zapisz" : "Dodaj"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
