"use client";

const colorSchemes: Record<string, string> = {
  coral: "bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400",
  amber: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400",
  blue: "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400",
  cyan: "bg-cyan-50 text-cyan-600 dark:bg-cyan-950/40 dark:text-cyan-400",
  violet: "bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400",
  indigo: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400",
  green: "bg-green-50 text-green-600 dark:bg-green-950/40 dark:text-green-400",
  red: "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400",
  gray: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

interface BadgeProps {
  color: keyof typeof colorSchemes;
  label: string;
  className?: string;
}

export default function Badge({ color, label, className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-md ${colorSchemes[color] || colorSchemes.gray} ${className}`}
    >
      {label}
    </span>
  );
}
