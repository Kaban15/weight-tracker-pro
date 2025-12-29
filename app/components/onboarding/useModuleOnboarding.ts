"use client";

import { useState, useCallback } from "react";
import { useOnboarding } from "@/lib/OnboardingContext";

type ModuleName = "tracker" | "challenge" | "planner" | "todo";

interface TooltipConfig {
  id: string;
  content: string;
  position?: "top" | "bottom" | "left" | "right";
}

export function useModuleOnboarding(module: ModuleName, tooltips: TooltipConfig[]) {
  const { isModuleCompleted, markModuleCompleted } = useOnboarding();
  const [currentStep, setCurrentStep] = useState(0);

  const isCompleted = isModuleCompleted(module);
  const totalSteps = tooltips.length;
  const currentTooltip = tooltips[currentStep];

  const isTooltipVisible = useCallback(
    (tooltipId: string): boolean => {
      if (isCompleted) return false;
      return currentTooltip?.id === tooltipId;
    },
    [isCompleted, currentTooltip]
  );

  const dismissCurrentTooltip = useCallback(() => {
    if (currentStep < totalSteps - 1) {
      // Move to next tooltip
      setCurrentStep(prev => prev + 1);
    } else {
      // All tooltips seen, mark module as completed
      markModuleCompleted(module);
    }
  }, [currentStep, totalSteps, markModuleCompleted, module]);

  const skipAllTooltips = useCallback(() => {
    markModuleCompleted(module);
  }, [markModuleCompleted, module]);

  return {
    isCompleted,
    currentStep: currentStep + 1,
    totalSteps,
    currentTooltipId: currentTooltip?.id,
    isTooltipVisible,
    dismissCurrentTooltip,
    skipAllTooltips,
    getTooltipProps: (tooltipId: string) => {
      const tooltip = tooltips.find(t => t.id === tooltipId);
      return {
        show: isTooltipVisible(tooltipId),
        content: tooltip?.content || "",
        position: tooltip?.position || "bottom" as const,
        onDismiss: dismissCurrentTooltip,
        step: currentStep + 1,
        totalSteps,
      };
    },
  };
}
