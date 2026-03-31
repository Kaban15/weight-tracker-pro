"use client";

import { Scale, Target, ListTodo } from "lucide-react";
import type { UserStats } from "./types";
import { getEffectiveActivity, formatRelativeTime, getActivityDotClass } from "./adminUtils";

interface AdminUserTableProps {
  users: UserStats[];
}

export default function AdminUserTable({ users }: AdminUserTableProps) {
  return (
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
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Ostatnia aktywność</th>
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
            {users.map((user, index) => {
              const effective = getEffectiveActivity(user.lastSignIn, user.lastActivityAt);
              const dotClass = getActivityDotClass(effective);
              const label = formatRelativeTime(effective);

              return (
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
                  <td className="px-4 py-3 text-sm">
                    <span className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${dotClass} inline-block shrink-0`} />
                      <span className={effective ? "text-slate-300" : "text-slate-500"}>{label}</span>
                    </span>
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
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
