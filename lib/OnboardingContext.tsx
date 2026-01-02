"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useAuth } from "./AuthContext";

type ModuleName = "tracker" | "challenge" | "todo";

interface OnboardingState {
  hasSeenWelcome: boolean;
  modulesCompleted: Record<ModuleName, boolean>;
}

interface OnboardingContextType {
  hasSeenWelcome: boolean;
  isModuleCompleted: (module: ModuleName) => boolean;
  markWelcomeSeen: () => void;
  markModuleCompleted: (module: ModuleName) => void;
  resetOnboarding: () => void;
  isLoaded: boolean;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

const STORAGE_KEY_PREFIX = "onboarding_";

const defaultState: OnboardingState = {
  hasSeenWelcome: false,
  modulesCompleted: {
    tracker: false,
    challenge: false,
    todo: false,
  },
};

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<OnboardingState>(defaultState);
  const [isLoaded, setIsLoaded] = useState(false);

  const storageKey = user?.id ? `${STORAGE_KEY_PREFIX}${user.id}` : null;

  // Load onboarding state from localStorage
  useEffect(() => {
    if (!storageKey) {
      setIsLoaded(true);
      return;
    }

    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as OnboardingState;
        setState(parsed);
      }
    } catch {
      // Invalid data, use defaults
    }
    setIsLoaded(true);
  }, [storageKey]);

  // Save to localStorage whenever state changes
  const saveState = (newState: OnboardingState) => {
    setState(newState);
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(newState));
      } catch {
        // Storage full or unavailable
      }
    }
  };

  const markWelcomeSeen = () => {
    saveState({ ...state, hasSeenWelcome: true });
  };

  const markModuleCompleted = (module: ModuleName) => {
    saveState({
      ...state,
      modulesCompleted: { ...state.modulesCompleted, [module]: true },
    });
  };

  const isModuleCompleted = (module: ModuleName): boolean => {
    return state.modulesCompleted[module];
  };

  const resetOnboarding = () => {
    saveState(defaultState);
  };

  return (
    <OnboardingContext.Provider
      value={{
        hasSeenWelcome: state.hasSeenWelcome,
        isModuleCompleted,
        markWelcomeSeen,
        markModuleCompleted,
        resetOnboarding,
        isLoaded,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error("useOnboarding must be used within an OnboardingProvider");
  }
  return context;
}
