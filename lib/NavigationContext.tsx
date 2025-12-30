"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export type AppMode = 'tracker' | 'challenge' | 'planner' | 'todo' | 'schedule' | 'admin' | null;
export type SubView = string | null;

interface NavigationState {
  mode: AppMode;
  subView: SubView;
}

interface NavigationContextType {
  currentMode: AppMode;
  currentSubView: SubView;
  history: NavigationState[];
  navigateTo: (mode: AppMode, subView?: SubView) => void;
  navigateToSubView: (subView: SubView) => void;
  goBack: () => void;
  goHome: () => void;
  canGoBack: boolean;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [history, setHistory] = useState<NavigationState[]>([{ mode: null, subView: null }]);

  const currentState = history[history.length - 1];
  const currentMode = currentState.mode;
  const currentSubView = currentState.subView;
  const canGoBack = history.length > 1;

  const navigateTo = useCallback((mode: AppMode, subView: SubView = null) => {
    setHistory(prev => [...prev, { mode, subView }]);
  }, []);

  const navigateToSubView = useCallback((subView: SubView) => {
    setHistory(prev => {
      const current = prev[prev.length - 1];
      return [...prev, { mode: current.mode, subView }];
    });
  }, []);

  const goBack = useCallback(() => {
    setHistory(prev => {
      if (prev.length <= 1) return prev;
      return prev.slice(0, -1);
    });
  }, []);

  const goHome = useCallback(() => {
    setHistory([{ mode: null, subView: null }]);
  }, []);

  return (
    <NavigationContext.Provider
      value={{
        currentMode,
        currentSubView,
        history,
        navigateTo,
        navigateToSubView,
        goBack,
        goHome,
        canGoBack,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error("useNavigation must be used within a NavigationProvider");
  }
  return context;
}
