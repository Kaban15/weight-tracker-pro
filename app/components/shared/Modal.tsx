"use client";

import { useEffect, useCallback } from "react";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  /** max-w-xs | max-w-sm | max-w-md (default) | max-w-lg | max-w-xl | max-w-2xl */
  size?: string;
  children: React.ReactNode;
  /** Show X close button in header (default: true) */
  showClose?: boolean;
  /** Additional classes for the content container */
  className?: string;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  size = "max-w-md",
  children,
  showClose = true,
  className = "",
}: ModalProps) {
  // Close on Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`bg-slate-800 rounded-xl border-2 border-slate-700 p-6 w-full ${size} max-h-[90vh] overflow-y-auto ${className}`}
      >
        {(title || showClose) && (
          <div className="flex items-center justify-between mb-4">
            {title && (
              <h2 className="text-lg font-bold text-white">{title}</h2>
            )}
            {showClose && (
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white transition-colors ml-auto"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
