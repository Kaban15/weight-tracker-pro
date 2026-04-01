"use client";

import { type ReactNode } from "react";

interface SubtleCardProps {
  icon?: ReactNode;
  title?: string;
  children: ReactNode;
  className?: string;
}

export default function SubtleCard({
  icon,
  title,
  children,
  className = "",
}: SubtleCardProps) {
  return (
    <div className={`bg-[var(--surface)] rounded-xl p-3.5 ${className}`}>
      {(icon || title) && (
        <div className="flex items-center gap-2 mb-1">
          {icon}
          {title && (
            <p className="text-xs text-[var(--muted)]">{title}</p>
          )}
        </div>
      )}
      <div className="text-sm text-[var(--foreground)]">{children}</div>
    </div>
  );
}
