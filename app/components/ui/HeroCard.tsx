"use client";

interface HeroCardProps {
  color: string;
  colorLight?: string;
  label: string;
  value: string;
  subtitle?: string;
  progress?: { value: number; max: number };
  className?: string;
}

export default function HeroCard({
  color,
  colorLight,
  label,
  value,
  subtitle,
  progress,
  className = "",
}: HeroCardProps) {
  const gradientEnd = colorLight || color;
  const pct = progress ? Math.min((progress.value / progress.max) * 100, 100) : 0;

  return (
    <div
      className={`rounded-2xl p-5 md:p-6 text-white animate-fade-in-up ${className}`}
      style={{ background: `linear-gradient(135deg, ${color}, ${gradientEnd})` }}
    >
      <p className="text-xs font-medium uppercase tracking-wider opacity-80">
        {label}
      </p>
      <p className="text-3xl md:text-4xl font-bold mt-1">{value}</p>
      {subtitle && (
        <p className="text-sm opacity-85 mt-1">{subtitle}</p>
      )}
      {progress && (
        <div className="mt-4">
          <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full animate-progress-fill"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs opacity-70 mt-1.5">
            {Math.round(pct)}% ukończone
          </p>
        </div>
      )}
    </div>
  );
}
