"use client";

import { useState } from "react";
import {
  ArrowLeft,
  Users,
  Activity,
  TrendingUp,
  Calendar,
  Target,
  ListTodo,
  RefreshCw,
  BarChart3,
  UserPlus,
  Scale,
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useAdmin } from "./useAdmin";

interface AdminModeProps {
  onBack: () => void;
}

export default function AdminMode({ onBack }: AdminModeProps) {
  const { user } = useAuth();
  const { isAdmin, statistics, users, dailyActivity, isLoading, error, refresh } = useAdmin(user?.email);
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "activity">("overview");
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-red-950 flex items-center justify-center p-4">
        <div className="bg-slate-800/50 rounded-xl p-8 text-center max-w-md">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Brak dostępu</h2>
          <p className="text-slate-400 mb-6">
            Nie masz uprawnień administratora.
          </p>
          <button
            onClick={onBack}
            className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-xl font-semibold"
          >
            Powrót
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-white">Panel Admina</h1>
              <p className="text-slate-400 text-sm">
                Statystyki aplikacji i użytkowników
              </p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white px-4 py-2 rounded-xl font-semibold flex items-center gap-2 transition-colors"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Odśwież</span>
          </button>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 mb-6 text-red-400">
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {[
            { id: "overview", label: "Przegląd", icon: BarChart3 },
            { id: "users", label: "Użytkownicy", icon: Users },
            { id: "activity", label: "Aktywność", icon: Activity },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors whitespace-nowrap ${
                activeTab === id
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-800/50 text-slate-400 hover:text-white"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && statistics && (
          <div className="space-y-6">
            {/* Main Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                icon={Users}
                label="Wszyscy użytkownicy"
                value={statistics.totalUsers}
                color="indigo"
              />
              <StatCard
                icon={Activity}
                label="Aktywni (7 dni)"
                value={statistics.activeUsersLast7Days}
                color="emerald"
              />
              <StatCard
                icon={TrendingUp}
                label="Aktywni (30 dni)"
                value={statistics.activeUsersLast30Days}
                color="blue"
              />
              <StatCard
                icon={UserPlus}
                label="Nowi dziś"
                value={statistics.newUsersToday}
                color="amber"
              />
            </div>

            {/* New Users Stats */}
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-400" />
                Nowi użytkownicy
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-white">{statistics.newUsersToday}</div>
                  <div className="text-slate-400 text-sm">Dziś</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-white">{statistics.newUsersThisWeek}</div>
                  <div className="text-slate-400 text-sm">Ten tydzień</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-white">{statistics.newUsersThisMonth}</div>
                  <div className="text-slate-400 text-sm">Ten miesiąc</div>
                </div>
              </div>
            </div>

            {/* Usage Stats */}
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-400" />
                Statystyki użycia
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <UsageItem
                  icon={Scale}
                  label="Wpisy wagi"
                  total={statistics.totalEntries}
                  average={statistics.averageEntriesPerUser}
                  color="emerald"
                />
                <UsageItem
                  icon={Target}
                  label="Wyzwania"
                  total={statistics.totalChallenges}
                  average={statistics.averageChallengesPerUser}
                  color="amber"
                />
                <UsageItem
                  icon={ListTodo}
                  label="Zadania"
                  total={statistics.totalTasks}
                  average={statistics.totalUsers > 0 ? Math.round(statistics.totalTasks / statistics.totalUsers) : 0}
                  color="rose"
                />
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === "users" && (
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
            <div className="p-4 border-b border-slate-700">
              <h3 className="text-lg font-semibold text-white">
                Lista użytkowników ({users.length})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-700/50">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">#</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">ID</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Dołączył</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-slate-300">
                      <Scale className="w-4 h-4 inline" /> Wpisy
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-slate-300">
                      <Target className="w-4 h-4 inline" /> Wyzwania
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-slate-300">
                      <ListTodo className="w-4 h-4 inline" /> Zadania
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user, index) => (
                    <tr
                      key={user.id}
                      className="border-t border-slate-700/50 hover:bg-slate-700/30"
                    >
                      <td className="px-4 py-3 text-slate-500 text-sm">{index + 1}</td>
                      <td className="px-4 py-3 text-white font-mono text-sm">{user.email}</td>
                      <td className="px-4 py-3 text-slate-400 text-sm">
                        {user.createdAt
                          ? new Date(user.createdAt).toLocaleDateString("pl-PL")
                          : "-"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-semibold ${user.entriesCount > 0 ? "text-emerald-400" : "text-slate-500"}`}>
                          {user.entriesCount}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-semibold ${user.challengesCount > 0 ? "text-amber-400" : "text-slate-500"}`}>
                          {user.challengesCount}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-semibold ${user.tasksCount > 0 ? "text-rose-400" : "text-slate-500"}`}>
                          {user.tasksCount}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Activity Tab */}
        {activeTab === "activity" && (
          <div className="space-y-6">
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-400" />
                Aktywność dzienna (ostatnie 14 dni)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-700/50">
                      <th className="px-4 py-2 text-left text-sm font-semibold text-slate-300">Data</th>
                      <th className="px-4 py-2 text-center text-sm font-semibold text-slate-300">Nowi użytkownicy</th>
                      <th className="px-4 py-2 text-center text-sm font-semibold text-slate-300">Aktywni</th>
                      <th className="px-4 py-2 text-center text-sm font-semibold text-slate-300">Wpisy</th>
                      <th className="px-4 py-2 text-left text-sm font-semibold text-slate-300">Wykres</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyActivity.map((day) => {
                      const maxEntries = Math.max(...dailyActivity.map((d) => d.entries), 1);
                      const barWidth = (day.entries / maxEntries) * 100;
                      const isToday = day.date === new Date().toISOString().split("T")[0];

                      return (
                        <tr
                          key={day.date}
                          className={`border-t border-slate-700/50 ${
                            isToday ? "bg-indigo-950/30" : ""
                          }`}
                        >
                          <td className="px-4 py-2 text-white text-sm">
                            {new Date(day.date).toLocaleDateString("pl-PL", {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                            })}
                            {isToday && (
                              <span className="ml-2 text-xs bg-indigo-600 px-2 py-0.5 rounded">
                                dziś
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-center">
                            <span className={`font-semibold ${day.newUsers > 0 ? "text-emerald-400" : "text-slate-500"}`}>
                              {day.newUsers > 0 ? `+${day.newUsers}` : "0"}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-center">
                            <span className={`font-semibold ${day.activeUsers > 0 ? "text-blue-400" : "text-slate-500"}`}>
                              {day.activeUsers}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-center">
                            <span className={`font-semibold ${day.entries > 0 ? "text-indigo-400" : "text-slate-500"}`}>
                              {day.entries}
                            </span>
                          </td>
                          <td className="px-4 py-2 w-48">
                            <div className="h-4 bg-slate-700 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 transition-all"
                                style={{ width: `${barWidth}%` }}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper Components
function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: "indigo" | "emerald" | "blue" | "amber" | "rose" | "violet";
}) {
  const colors = {
    indigo: "bg-indigo-500/20 text-indigo-400",
    emerald: "bg-emerald-500/20 text-emerald-400",
    blue: "bg-blue-500/20 text-blue-400",
    amber: "bg-amber-500/20 text-amber-400",
    rose: "bg-rose-500/20 text-rose-400",
    violet: "bg-violet-500/20 text-violet-400",
  };

  return (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
      <div className={`w-10 h-10 rounded-lg ${colors[color]} flex items-center justify-center mb-3`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-3xl font-bold text-white mb-1">{value}</div>
      <div className="text-slate-400 text-sm">{label}</div>
    </div>
  );
}

function UsageItem({
  icon: Icon,
  label,
  total,
  average,
  color,
}: {
  icon: React.ElementType;
  label: string;
  total: number;
  average: number;
  color: "emerald" | "amber" | "rose" | "violet";
}) {
  const colors = {
    emerald: "text-emerald-400",
    amber: "text-amber-400",
    rose: "text-rose-400",
    violet: "text-violet-400",
  };

  return (
    <div className="text-center p-4 bg-slate-700/30 rounded-xl">
      <Icon className={`w-6 h-6 ${colors[color]} mx-auto mb-2`} />
      <div className="text-2xl font-bold text-white">{total}</div>
      <div className="text-slate-400 text-xs mb-1">{label}</div>
      <div className="text-slate-500 text-xs">
        śr. {average}/użytkownika
      </div>
    </div>
  );
}
