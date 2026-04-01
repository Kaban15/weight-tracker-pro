"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/ThemeContext";

interface ThemeToggleProps {
  className?: string;
}

export default function ThemeToggle({ className = "" }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`p-2 rounded-lg transition-colors bg-[var(--surface)] hover:bg-[var(--card-border)] text-[var(--foreground)] ${className}`}
      aria-label={theme === "dark" ? "Przełącz na jasny motyw" : "Przełącz na ciemny motyw"}
      title={theme === "dark" ? "Jasny motyw" : "Ciemny motyw"}
    >
      {theme === "dark" ? (
        <Sun className="w-5 h-5" aria-hidden="true" />
      ) : (
        <Moon className="w-5 h-5" aria-hidden="true" />
      )}
    </button>
  );
}
