// app/components/ui/Toast.tsx
"use client";

import { useEffect, useState, useRef, useCallback } from 'react';
import { Check, AlertTriangle } from 'lucide-react';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
  duration?: number;
}

export default function Toast({ message, type, onClose, duration = 3000 }: ToastProps) {
  const [visible, setVisible] = useState(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const stableClose = useCallback(() => onCloseRef.current(), []);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(stableClose, 150);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, stableClose]);

  return (
    <div
      className={`fixed bottom-20 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 px-4 py-3 rounded-full shadow-lg transition-all duration-150 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      } ${
        type === 'success'
          ? 'bg-green-600 text-white'
          : 'bg-red-600 text-white'
      }`}
    >
      {type === 'success'
        ? <Check className="w-[18px] h-[18px]" strokeWidth={1.5} />
        : <AlertTriangle className="w-[18px] h-[18px]" strokeWidth={1.5} />}
      <span className="text-[13px] font-bold">{message}</span>
    </div>
  );
}
