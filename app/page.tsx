"use client";

import { useAuth } from "@/lib/AuthContext";
import { useOnboarding } from "@/lib/OnboardingContext";
import { useNavigation } from "@/lib/NavigationContext";
import Auth from "./components/Auth";
import WeightTracker from "./components/WeightTracker";
import ModeSelector from "./components/ModeSelector";
import ChallengeMode from "./components/ChallengeMode";
import { TodoMode } from "./components/todo";
import { ScheduleMode } from "./components/schedule";
import { AdminMode } from "./components/admin";
import WelcomeModal from "./components/onboarding/WelcomeModal";

export default function Home() {
  const { user, loading } = useAuth();
  const { hasSeenWelcome, markWelcomeSeen, isLoaded } = useOnboarding();
  const { currentMode, goBack } = useNavigation();

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

  if (!currentMode) {
    return <ModeSelector />;
  }

  if (currentMode === 'challenge') {
    return <ChallengeMode onBack={goBack} />;
  }

  if (currentMode === 'todo') {
    return <TodoMode onBack={goBack} />;
  }

  if (currentMode === 'schedule') {
    return <ScheduleMode onBack={goBack} />;
  }

  if (currentMode === 'admin') {
    return <AdminMode onBack={goBack} />;
  }

  return <WeightTracker onBack={goBack} />;
}
