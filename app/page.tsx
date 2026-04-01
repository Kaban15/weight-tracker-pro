"use client";

import { useAuth } from "@/lib/AuthContext";
import { useOnboarding } from "@/lib/OnboardingContext";
import { useNavigation } from "@/lib/NavigationContext";
import Auth from "./components/Auth";
import { AppShell } from "./components/layout";
import { PageTransition } from "./components/ui";
import Dashboard from "./components/Dashboard";
import WeightTracker from "./components/WeightTracker";
import ChallengeMode from "./components/ChallengeMode";
import { TodoModeWeekly } from "./components/todo";
import { ScheduleModeWeekly } from "./components/schedule";
import { AdminMode } from "./components/admin";
import { MealsMode } from "./components/meals";
import WelcomeModal from "./components/onboarding/WelcomeModal";

export default function Home() {
  const { user, loading } = useAuth();
  const { hasSeenWelcome, markWelcomeSeen, isLoaded } = useOnboarding();
  const { currentMode } = useNavigation();

  if (loading || !isLoaded) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="w-12 h-12 border-4 rounded-full animate-spin"
          style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  if (!user) return <Auth />;
  if (!hasSeenWelcome) return <WelcomeModal onComplete={markWelcomeSeen} />;

  const renderContent = () => {
    switch (currentMode) {
      case "tracker": return <WeightTracker />;
      case "challenge": return <ChallengeMode />;
      case "todo": return <TodoModeWeekly />;
      case "schedule": return <ScheduleModeWeekly />;
      case "admin": return <AdminMode />;
      case "meals": return <MealsMode />;
      default: return <Dashboard />;
    }
  };

  return (
    <AppShell>
      <PageTransition transitionKey={currentMode || "dashboard"}>
        {renderContent()}
      </PageTransition>
    </AppShell>
  );
}
