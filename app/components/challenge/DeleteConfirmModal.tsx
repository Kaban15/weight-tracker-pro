"use client";

import { AlertTriangle } from "lucide-react";
import Modal from "../shared/Modal";

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
  return (
    <Modal isOpen={isOpen} onClose={onCancel} size="max-w-sm" showClose={false} className="text-center">
      <div className="w-14 h-14 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
        <AlertTriangle className="w-7 h-7 text-rose-400" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-[var(--muted)] text-sm mb-6">{message}</p>
      <div className="flex gap-3">
        <button onClick={onCancel} className="flex-1 bg-[var(--surface)] hover:bg-[var(--surface)] text-white py-2 rounded-lg">
          Anuluj
        </button>
        <button onClick={onConfirm} className="flex-1 bg-rose-600 hover:bg-rose-500 text-white py-2 rounded-lg" autoFocus>
          Usuń
        </button>
      </div>
    </Modal>
  );
}
