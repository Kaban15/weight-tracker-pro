"use client";

import { useEffect, useState } from "react";
import { Scale, Plus, Target, CheckSquare, PackageX } from "lucide-react";
import { HeroCard, StatCard, SubtleCard } from "./ui";
import { useAuth } from "@/lib/AuthContext";
import { useNavigation } from "@/lib/NavigationContext";
import { useWeightTracker } from "./tracker";
import { useChallenges } from "./challenge";
import { useTasks } from "./todo";
import { usePantryWriteOffs } from "./meals/usePantryWriteOffs";
import { initializeNotifications } from "@/lib/notifications";
import { formatDate } from "./shared/dateUtils";

export default function Dashboard() {
  const { user } = useAuth();
  const { navigateTo } = useNavigation();
  const { sortedEntries, goal } = useWeightTracker(user?.id);
  const { challenges } = useChallenges(user?.id);
  const { tasks } = useTasks(user?.id);
  const pantryWriteOffs = usePantryWriteOffs(user?.id);
  const [wasteSummary, setWasteSummary] = useState({ monthlyTotal: 0, monthlyCount: 0 });

  const { loadMonthlySummary } = pantryWriteOffs;
  useEffect(() => {
    if (user?.id) {
      const now = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      loadMonthlySummary(month).then(setWasteSummary);
    }
  }, [user?.id, loadMonthlySummary]);

  useEffect(() => {
    initializeNotifications();
  }, []);

  const latestEntry = sortedEntries?.length ? sortedEntries[sortedEntries.length - 1] : undefined;
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
  const isChallengeCompletedToday = (c: typeof activeChallenges[number]) => (c.completedDays[today] ?? 0) > 0;
  const todayDone = activeChallenges.filter(isChallengeCompletedToday).length;

  const pendingTasks = tasks?.filter(t => !t.completed && t.status !== 'done' && t.status !== 'cancelled') ?? [];

  // Calculate streak: consecutive days (including today if all done) where ALL active challenges were completed
  const streak = (() => {
    if (activeChallenges.length === 0) return 0;
    let count = 0;
    const d = new Date();
    // Start from today — if all done today, count it
    const todayAllDone = activeChallenges.every(c => (c.completedDays[today] ?? 0) > 0);
    if (!todayAllDone) {
      // Today not done yet, start checking from yesterday
      d.setDate(d.getDate() - 1);
    }
    for (let i = 0; i < 365; i++) {
      const dayStr = formatDate(d);
      // At least one challenge must be active on this day for the day to count
      const activeOnDay = activeChallenges.filter(c => dayStr >= c.startDate && dayStr <= c.endDate);
      if (activeOnDay.length === 0) break;
      const allDone = activeOnDay.every(c => (c.completedDays[dayStr] ?? 0) > 0);
      if (!allDone) break;
      count++;
      d.setDate(d.getDate() - 1);
    }
    return count;
  })();

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
        <StatCard label="Zadania" value={pendingTasks.length} description="do zrobienia" color="text-blue-500" />
        <StatCard label="Streak" value={streak || "—"} description="dni z rzędu" color="text-[var(--accent)]" className="hidden md:block" />
      </div>

      <div className="flex gap-2 mb-6">
        <button onClick={() => navigateTo("tracker")} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-colors" style={{ background: "var(--accent)" }}>
          <Scale className="w-4 h-4" /> Zapisz wagę
        </button>
        <button onClick={() => navigateTo("todo")} className="flex items-center gap-2 px-4 py-2.5 bg-[var(--surface)] rounded-xl text-sm font-medium text-[var(--foreground)] hover:bg-[var(--card-border)] transition-colors">
          <Plus className="w-4 h-4" /> Dodaj zadanie
        </button>
      </div>

      {wasteSummary.monthlyTotal > 0 && (
        <div
          onClick={() => {
            if (typeof window !== 'undefined') {
              localStorage.setItem('pantry-show-write-offs', 'true');
            }
            navigateTo('meals');
          }}
          className="cursor-pointer mb-6"
          role="button"
          tabIndex={0}
        >
          <SubtleCard>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-violet-500/20 rounded-lg">
                <PackageX className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <p className="text-xs text-[var(--muted)]">Straty w tym miesiącu</p>
                <p className="text-lg font-semibold text-red-400">{wasteSummary.monthlyTotal.toFixed(2)} zł</p>
                <p className="text-xs text-[var(--muted)]">{wasteSummary.monthlyCount} produktów</p>
              </div>
            </div>
          </SubtleCard>
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold text-[var(--foreground)] mb-3">Nadchodzące</h2>
        <div className="space-y-2">
          {pendingTasks.slice(0, 5).map(task => (
            <div key={task.id} className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-3 flex items-center gap-3 cursor-pointer hover:shadow-md transition-all" onClick={() => navigateTo("todo")}>
              <CheckSquare className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <span className="text-sm text-[var(--foreground)] truncate">{task.title}</span>
              {task.deadline && <span className="text-xs text-[var(--muted)] ml-auto flex-shrink-0">{task.deadline}</span>}
            </div>
          ))}
          {activeChallenges.filter(c => !isChallengeCompletedToday(c)).slice(0, 3).map(challenge => (
            <div key={challenge.id} className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-3 flex items-center gap-3 cursor-pointer hover:shadow-md transition-all" onClick={() => navigateTo("challenge")}>
              <Target className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <span className="text-sm text-[var(--foreground)] truncate">{challenge.name}</span>
              <span className="text-xs text-[var(--accent)] ml-auto flex-shrink-0">do zrobienia</span>
            </div>
          ))}
          {pendingTasks.length === 0 && activeChallenges.filter(c => !isChallengeCompletedToday(c)).length === 0 && (
            <SubtleCard>
              <p className="text-[var(--muted)]">Brak nadchodzących zadań. Dobra robota! 💪</p>
            </SubtleCard>
          )}
        </div>
      </div>
    </div>
  );
}
