"use client";

import { useAnimatedCounter } from "@/app/hooks/useAnimatedCounter";

interface AnimatedCounterProps {
  value: number;
  suffix?: string;
  decimals?: number;
  className?: string;
}

export default function AnimatedCounter({
  value,
  suffix = "",
  decimals = 0,
  className = "",
}: AnimatedCounterProps) {
  const display = useAnimatedCounter(value, { decimals });

  return (
    <span className={className}>
      {display}{suffix}
    </span>
  );
}
