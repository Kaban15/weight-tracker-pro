"use client";

import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useOnboarding } from "@/lib/OnboardingContext";
import Auth from "./components/Auth";
import WeightTracker from "./components/WeightTracker";
import ModeSelector from "./components/ModeSelector";
import ChallengeMode from "./components/ChallengeMode";
import { PlannerMode } from "./components/planner";
import { TodoMode } from "./components/todo";
import { AdminMode } from "./components/admin";
import WelcomeModal from "./components/onboarding/WelcomeModal";

type AppMode = 'tracker' | 'challenge' | 'planner' | 'todo' | 'admin' | null;

export default function Home() {
  const { user, loading } = useAuth();
  const { hasSeenWelcome, markWelcomeSeen, isLoaded } = useOnboarding();
  const [mode, setMode] = useState<AppMode>(null);

  if (loading || !isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  // Show welcome modal for first-time users
  if (!hasSeenWelcome) {
    return <WelcomeModal onComplete={markWelcomeSeen} />;
  }

  if (!mode) {
    return <ModeSelector onSelectMode={setMode} />;
  }

  if (mode === 'challenge') {
    return <ChallengeMode onBack={() => setMode(null)} />;
  }

  if (mode === 'planner') {
    return <PlannerMode onBack={() => setMode(null)} />;
  }

  if (mode === 'todo') {
    return <TodoMode onBack={() => setMode(null)} />;
  }

  if (mode === 'admin') {
    return <AdminMode onBack={() => setMode(null)} />;
  }

  return <WeightTracker onBack={() => setMode(null)} />;
}
