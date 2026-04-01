"use client";

interface StatCardProps {
  label: string;
  value: string | number;
  description?: string;
  color?: string;
  className?: string;
}

export default function StatCard({
  label,
  value,
  description,
  color = "text-[var(--foreground)]",
  className = "",
}: StatCardProps) {
  return (
    <div
      className={`bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4 animate-fade-in-up ${className}`}
    >
      <p className="text-xs text-[var(--muted)]">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
      {description && (
        <p className="text-xs text-[var(--muted)] mt-1">{description}</p>
      )}
    </div>
  );
}
