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
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-emerald-400" />
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
                const barWidth = (day.entries / maxEntries) * 100;
                const isTodayRow = day.date === todayStr;

                return (
                  <tr
                    key={day.date}
                    className={`border-t border-slate-700/50 ${isTodayRow ? "bg-emerald-950/30" : ""}`}
                  >
                    <td className="px-4 py-2 text-white text-sm">
                      {new Date(day.date).toLocaleDateString("pl-PL", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })}
                      {isTodayRow && (
                        <span className="ml-2 text-xs bg-emerald-600 px-2 py-0.5 rounded">
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
                      <span className={`font-semibold ${day.entries > 0 ? "text-emerald-400" : "text-slate-500"}`}>
                        {day.entries}
                      </span>
                    </td>
                    <td className="px-4 py-2 w-48">
                      <div className="h-4 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all"
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
