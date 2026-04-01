"use client";

interface ProgressBarProps {
  value: number;
  max: number;
  color?: string;
  colorEnd?: string;
  height?: string;
  animated?: boolean;
  className?: string;
}

export default function ProgressBar({
  value,
  max,
  color = "#FF6B4A",
  colorEnd,
  height = "h-2",
  animated = true,
  className = "",
}: ProgressBarProps) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const end = colorEnd || color;

  return (
    <div className={`${height} bg-[var(--surface)] rounded-full overflow-hidden ${className}`}>
      <div
        className={`h-full rounded-full ${animated ? "animate-progress-fill" : ""}`}
        style={{
          width: `${pct}%`,
          background: `linear-gradient(90deg, ${color}, ${end})`,
        }}
      />
    </div>
  );
}
