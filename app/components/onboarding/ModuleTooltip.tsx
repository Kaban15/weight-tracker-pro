"use client";

import { ReactNode } from "react";

interface ModuleTooltipProps {
  children: ReactNode;
  content: string;
  position?: "top" | "bottom" | "left" | "right";
  show: boolean;
  onDismiss: () => void;
  pulse?: boolean;
  step?: number;
  totalSteps?: number;
}

export default function ModuleTooltip({
  children,
  content,
  position = "bottom",
  show,
  onDismiss,
  pulse = true,
  step,
  totalSteps,
}: ModuleTooltipProps) {
  if (!show) {
    return <>{children}</>;
  }

  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-3",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-3",
    left: "right-full top-1/2 -translate-y-1/2 mr-3",
    right: "left-full top-1/2 -translate-y-1/2 ml-3",
  };

  const arrowClasses = {
    top: "top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-violet-600",
    bottom: "bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-violet-600",
    left: "left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-violet-600",
    right: "right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-violet-600",
  };

  return (
    <div className="relative inline-block">
      {/* Pulse ring animation */}
      {pulse && (
        <div className="absolute inset-0 rounded-lg animate-pulse-ring pointer-events-none" />
      )}

      {/* Highlighted element */}
      <div className={`relative z-10 ${pulse ? "ring-2 ring-violet-500 ring-offset-2 ring-offset-slate-900 rounded-lg" : ""}`}>
        {children}
      </div>

      {/* Tooltip */}
      <div
        className={`absolute z-50 ${positionClasses[position]} animate-in fade-in zoom-in-95 duration-200`}
      >
        <div className="bg-violet-600 text-white px-4 py-3 rounded-xl shadow-lg shadow-violet-500/25 min-w-[200px] max-w-[280px]">
          {/* Step indicator */}
          {step && totalSteps && (
            <div className="text-violet-200 text-xs mb-1 font-medium">
              Krok {step} z {totalSteps}
            </div>
          )}

          {/* Content */}
          <p className="text-sm leading-relaxed mb-3">{content}</p>

          {/* OK button */}
          <button
            onClick={onDismiss}
            className="w-full py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
          >
            OK, rozumiem
          </button>
        </div>

        {/* Arrow */}
        <div
          className={`absolute w-0 h-0 border-8 ${arrowClasses[position]}`}
        />
      </div>

      {/* Backdrop for dismissing */}
      <div
        className="fixed inset-0 z-40"
        onClick={onDismiss}
      />
    </div>
  );
}
