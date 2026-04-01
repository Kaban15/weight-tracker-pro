"use client";

import { useState, useEffect, useRef } from "react";

interface UseAnimatedCounterOptions {
  duration?: number;
  decimals?: number;
  enabled?: boolean;
}

export function useAnimatedCounter(
  target: number,
  { duration = 800, decimals = 0, enabled = true }: UseAnimatedCounterOptions = {}
) {
  const [display, setDisplay] = useState(enabled ? 0 : target);
  const prevTarget = useRef(target);
  const rafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!enabled) {
      setDisplay(target);
      return;
    }

    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(target);
      return;
    }

    const startValue = prevTarget.current !== target ? display : 0;
    prevTarget.current = target;
    let startTime: number | null = null;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(startValue + (target - startValue) * eased);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration, enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  return decimals > 0 ? display.toFixed(decimals) : Math.round(display).toString();
}
