"use client";

import { Calendar } from "lucide-react";
import { formatDate } from "../shared/dateUtils";
import type { DailyActivity } from "./types";

interface AdminActivityTabProps {
  dailyActivity: DailyActivity[];
}

export default function AdminActivityTab({ dailyActivity }: AdminActivityTabProps) {
  const maxEntries = Math.max(...dailyActivity.map((d) => d.entries), 1);
  const todayStr = formatDate(new Date());

  return (
    <div className="space-y-6">
      <div className="bg-[var(--card-bg)] rounded-xl p-6 border border-[var(--card-border)]">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-[var(--accent)]" />
          Aktywność dzienna (ostatnie 14 dni)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[var(--surface)]">
                <th className="px-4 py-2 text-left text-sm font-semibold text-[var(--foreground)]">Data</th>
                <th className="px-4 py-2 text-center text-sm font-semibold text-[var(--foreground)]">Nowi użytkownicy</th>
                <th className="px-4 py-2 text-center text-sm font-semibold text-[var(--foreground)]">Aktywni</th>
                <th className="px-4 py-2 text-center text-sm font-semibold text-[var(--foreground)]">Wpisy</th>
                <th className="px-4 py-2 text-left text-sm font-semibold text-[var(--foreground)]">Wykres</th>
              </tr>
            </thead>
            <tbody>
              {dailyActivity.map((day) => {
                const barWidth = (day.entries / maxEntries) * 100;
                const isTodayRow = day.date === todayStr;

                return (
                  <tr
                    key={day.date}
                    className={`border-t border-[var(--card-border)] ${isTodayRow ? "bg-indigo-950/30" : ""}`}
                  >
                    <td className="px-4 py-2 text-white text-sm">
                      {new Date(day.date).toLocaleDateString("pl-PL", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })}
                      {isTodayRow && (
                        <span className="ml-2 text-xs bg-indigo-600 px-2 py-0.5 rounded">
                          dziś
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <span className={`font-semibold ${day.newUsers > 0 ? "text-[var(--accent)]" : "text-[var(--muted)]"}`}>
                        {day.newUsers > 0 ? `+${day.newUsers}` : "0"}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <span className={`font-semibold ${day.activeUsers > 0 ? "text-blue-400" : "text-[var(--muted)]"}`}>
                        {day.activeUsers}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <span className={`font-semibold ${day.entries > 0 ? "text-[var(--accent)]" : "text-[var(--muted)]"}`}>
                        {day.entries}
                      </span>
                    </td>
                    <td className="px-4 py-2 w-48">
                      <div className="h-4 bg-[var(--surface)] rounded-full overflow-hidden">
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
  );
}
