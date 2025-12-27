"use client";

import { AlertTriangle } from "lucide-react";

interface DeleteConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteConfirmModal({
  isOpen,
  title = "Usuń wyzwanie?",
  message = "Wszystkie postępy zostaną utracone.",
  onConfirm,
  onCancel
}: DeleteConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
      aria-describedby="delete-modal-description"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="bg-slate-800 rounded-xl border-2 border-slate-700 p-6 w-full max-w-sm text-center">
        <div className="w-14 h-14 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-7 h-7 text-rose-400" aria-hidden="true" />
        </div>
        <h3 id="delete-modal-title" className="text-lg font-semibold text-white mb-2">{title}</h3>
        <p id="delete-modal-description" className="text-slate-400 text-sm mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg"
          >
            Anuluj
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-rose-600 hover:bg-rose-500 text-white py-2 rounded-lg"
            autoFocus
          >
            Usuń
          </button>
        </div>
      </div>
    </div>
  );
}
