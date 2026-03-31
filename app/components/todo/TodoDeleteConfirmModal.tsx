"use client";

import { AlertTriangle, Trash2 } from "lucide-react";
import Modal from "../shared/Modal";

interface TodoDeleteConfirmModalProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export default function TodoDeleteConfirmModal({
  onConfirm,
  onCancel,
}: TodoDeleteConfirmModalProps) {
  return (
    <Modal isOpen={true} onClose={onCancel} size="max-w-sm" showClose={false}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 bg-rose-500/20 rounded-full flex items-center justify-center">
          <AlertTriangle className="w-6 h-6 text-rose-400" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">Usuń zadanie</h3>
          <p className="text-sm text-slate-400">Ta operacja jest nieodwracalna</p>
        </div>
      </div>
      <p className="text-slate-300 mb-6">Czy na pewno chcesz usunąć to zadanie?</p>
      <div className="flex gap-3">
        <button onClick={onCancel} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 rounded-xl">
          Anuluj
        </button>
        <button onClick={onConfirm} className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2">
          <Trash2 className="w-4 h-4" /> Usuń
        </button>
      </div>
    </Modal>
  );
}
