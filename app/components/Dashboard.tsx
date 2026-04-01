"use client";

import { useEffect } from "react";
import { Scale, Plus, Target, CheckSquare } from "lucide-react";
import { HeroCard, StatCard, SubtleCard } from "./ui";
import { useAuth } from "@/lib/AuthContext";
import { useNavigation } from "@/lib/NavigationContext";
import { useWeightTracker } from "./tracker";
import { useChallenges, getChallengeProgress } from "./challenge";
import { useTasks } from "./todo";
import { initializeNotifications } from "@/lib/notifications";
import { formatDate } from "./shared/dateUtils";

export default function Dashboard() {
  const { user } = useAuth();
  const { navigateTo } = useNavigation();
  const { entries, goal } = useWeightTracker(user?.id);
  const { challenges } = useChallenges(user?.id);
  const { tasks } = useTasks(user?.id);

  useEffect(() => {
    initializeNotifications();
  }, []);

  const latestEntry = entries?.[0];
  const weightValue = latestEntry ? `${latestEntry.weight} kg` : "—";
  const weightSubtitle = goal
    ? `Cel: ${goal.target_weight} kg`
    : undefined;
  const weightProgress = latestEntry && goal
    ? {
        value: Math.abs((goal.current_weight ?? latestEntry.weight) - latestEntry.weight),
        max: Math.abs((goal.current_weight ?? latestEntry.weight) - goal.target_weight),
      }
    : undefined;

  const today = formatDate(new Date());
  const activeChallenges = challenges?.filter(c => c.startDate <= today && c.endDate >= today) ?? [];
  const todayDone = activeChallenges.filter(c => {
    const progress = getChallengeProgress(c);
    return progress?.isCompleted;
  }).length;

  const todayTasks = tasks?.filter(t => !t.completed) ?? [];

  const firstName = user?.email?.split("@")[0] ?? "";

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <p className="text-sm text-[var(--muted)]">Cześć, {firstName} 👋</p>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Dashboard</h1>
      </div>

      <div className="mb-4">
        <HeroCard
          color="#FF6B4A"
          colorLight="#FF8566"
          label="Dzisiejsza waga"
          value={weightValue}
          subtitle={weightSubtitle}
          progress={weightProgress}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        <StatCard label="Wyzwania" value={`${todayDone}/${activeChallenges.length}`} description="na dziś" color="text-amber-500" />
        <StatCard label="Zadania" value={todayTasks.length} description="do zrobienia" color="text-blue-500" />
        <StatCard label="Streak" value="—" description="dni z rzędu" color="text-[var(--accent)]" className="hidden md:block" />
      </div>

      <div className="flex gap-2 mb-6">
        <button onClick={() => navigateTo("tracker")} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-colors" style={{ background: "var(--accent)" }}>
          <Scale className="w-4 h-4" /> Zapisz wagę
        </button>
        <button onClick={() => navigateTo("todo")} className="flex items-center gap-2 px-4 py-2.5 bg-[var(--surface)] rounded-xl text-sm font-medium text-[var(--foreground)] hover:bg-[var(--card-border)] transition-colors">
          <Plus className="w-4 h-4" /> Dodaj zadanie
        </button>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-[var(--foreground)] mb-3">Nadchodzące</h2>
        <div className="space-y-2">
          {todayTasks.slice(0, 5).map(task => (
            <div key={task.id} className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-3 flex items-center gap-3 cursor-pointer hover:shadow-md transition-all" onClick={() => navigateTo("todo")}>
              <CheckSquare className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <span className="text-sm text-[var(--foreground)] truncate">{task.title}</span>
              {task.deadline && <span className="text-xs text-[var(--muted)] ml-auto flex-shrink-0">{task.deadline}</span>}
            </div>
          ))}
          {activeChallenges.slice(0, 3).map(challenge => (
            <div key={challenge.id} className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-3 flex items-center gap-3 cursor-pointer hover:shadow-md transition-all" onClick={() => navigateTo("challenge")}>
              <Target className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <span className="text-sm text-[var(--foreground)] truncate">{challenge.name}</span>
              <span className="text-xs text-[var(--accent)] ml-auto flex-shrink-0">do zrobienia</span>
            </div>
          ))}
          {todayTasks.length === 0 && activeChallenges.length === 0 && (
            <SubtleCard>
              <p className="text-[var(--muted)]">Brak nadchodzących zadań. Dobra robota! 💪</p>
            </SubtleCard>
          )}
        </div>
      </div>
    </div>
  );
}
