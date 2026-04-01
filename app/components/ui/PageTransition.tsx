"use client";

import { useRef, useEffect, useState, type ReactNode } from "react";

interface PageTransitionProps {
  children: ReactNode;
  transitionKey: string;
  className?: string;
}

export default function PageTransition({
  children,
  transitionKey,
  className = "",
}: PageTransitionProps) {
  const [displayKey, setDisplayKey] = useState(transitionKey);
  const [phase, setPhase] = useState<"enter" | "idle">("idle");
  const prevKey = useRef(transitionKey);

  useEffect(() => {
    if (transitionKey !== prevKey.current) {
      prevKey.current = transitionKey;
      setPhase("enter");
      setDisplayKey(transitionKey);
      const timer = setTimeout(() => setPhase("idle"), 300);
      return () => clearTimeout(timer);
    }
  }, [transitionKey]);

  const reducedMotion = typeof window !== "undefined"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const style = reducedMotion || phase === "idle"
    ? { opacity: 1, transform: "none", transition: "none" }
    : {
        opacity: 1,
        transform: "none",
        transition: "opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1), transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        animation: "fade-in-up 0.3s cubic-bezier(0.16, 1, 0.3, 1) both",
      };

  return (
    <div key={displayKey} className={className} style={style}>
      {children}
    </div>
  );
}
