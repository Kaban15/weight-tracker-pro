"use client";

import { useState } from "react";
import { ArrowLeft, Users, Activity, BarChart3, RefreshCw } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useNavigation } from "@/lib/NavigationContext";
import { useAdmin } from "./useAdmin";
import AdminOverviewTab from "./AdminOverviewTab";
import AdminUserTable from "./AdminUserTable";
import AdminActivityTab from "./AdminActivityTab";

interface AdminModeProps {
  onBack?: () => void;
}

export default function AdminMode({ onBack }: AdminModeProps) {
  const { user } = useAuth();
  const { goHome } = useNavigation();
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
            onClick={() => { if (onBack) onBack(); else goHome(); }}
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
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => { if (onBack) onBack(); else goHome(); }}
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
            className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white px-4 py-2 rounded-xl font-semibold flex items-center gap-2 transition-colors"
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
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-800/50 text-slate-400 hover:text-white"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && statistics && (
          <AdminOverviewTab statistics={statistics} />
        )}

        {activeTab === "users" && (
          <AdminUserTable users={users} />
        )}

        {activeTab === "activity" && (
          <AdminActivityTab dailyActivity={dailyActivity} />
        )}
      </div>
    </div>
  );
}
