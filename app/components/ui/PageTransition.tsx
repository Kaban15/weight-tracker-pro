"use client";

import { useRef, useEffect, useState, type ReactNode } from "react";
import { useMediaQuery } from "@/app/hooks/useMediaQuery";

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
  const [phase, setPhase] = useState<"enter" | "idle">("idle");
  const prevKey = useRef(transitionKey);
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

  useEffect(() => {
    if (transitionKey !== prevKey.current) {
      prevKey.current = transitionKey;
      setPhase("enter");
      const timer = setTimeout(() => setPhase("idle"), 300);
      return () => clearTimeout(timer);
    }
  }, [transitionKey]);

  const style = reducedMotion || phase === "idle"
    ? { opacity: 1, transform: "none", transition: "none" }
    : {
        opacity: 1,
        transform: "none",
        transition: "opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1), transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        animation: "fade-in-up 0.3s cubic-bezier(0.16, 1, 0.3, 1) both",
      };

  return (
    <div key={transitionKey} className={className} style={style}>
      {children}
    </div>
  );
}
