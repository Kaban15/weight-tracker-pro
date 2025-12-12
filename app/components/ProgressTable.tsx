"use client";

import { TrendingUp, TrendingDown, Minus, Check, X } from 'lucide-react';

interface Entry {
  id: string;
  date: string;
  weight: number;
  calories?: number;
  steps?: number;
  workout?: string;
  workout_duration?: number;
}

interface Goal {
  current_weight: number;
  target_weight: number;
  target_date: string;
  start_date?: string;
  weekly_weight_loss?: number;
  daily_calories_limit?: number;
  daily_steps_goal?: number;
  weekly_training_hours?: number;
}

interface ProgressTableProps {
  entries: Entry[];
  goal: Goal | null;
}

export default function ProgressTable({ entries, goal }: ProgressTableProps) {
  if (!goal) {
    return (
      <div className="bg-slate-800/50 rounded-xl p-6 border-2 border-slate-700">
        <h3 className="text-xl font-bold text-white mb-4">Tabela postępów</h3>
        <p className="text-slate-400 text-center py-8">
          Ustaw cel, aby zobaczyć tabelę postępów.
        </p>
      </div>
    );
  }

  // Sort entries by date (newest first for display)
  const sortedEntries = [...entries].sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Calculate target weight for a given date
  const getTargetWeight = (date: string): number => {
    const startDate = goal.start_date ? new Date(goal.start_date) : new Date(sortedEntries[sortedEntries.length - 1]?.date || new Date());
    const endDate = new Date(goal.target_date);
    const currentDate = new Date(date);

    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const daysFromStart = Math.ceil((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    const totalWeightLoss = goal.current_weight - goal.target_weight;
    const dailyWeightLoss = totalWeightLoss / totalDays;

    return Math.max(
      goal.target_weight,
      goal.current_weight - (dailyWeightLoss * daysFromStart)
    );
  };

  // Get week number for grouping
  const getWeekNumber = (date: string): number => {
    const startDate = goal.start_date ? new Date(goal.start_date) : new Date(sortedEntries[sortedEntries.length - 1]?.date || new Date());
    const currentDate = new Date(date);
    const diffDays = Math.ceil((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    return Math.floor(diffDays / 7) + 1;
  };

  return (
    <div className="bg-slate-800/50 rounded-xl p-6 border-2 border-slate-700">
      <h3 className="text-xl font-bold text-white mb-4">Tabela postępów</h3>

      {sortedEntries.length === 0 ? (
        <p className="text-slate-400 text-center py-8">
          Brak wpisów. Dodaj swój pierwszy wpis!
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-3 px-2 text-slate-400 font-semibold">Data</th>
                <th className="text-left py-3 px-2 text-slate-400 font-semibold">Tydzień</th>
                <th className="text-right py-3 px-2 text-slate-400 font-semibold">Waga</th>
                <th className="text-right py-3 px-2 text-amber-400 font-semibold">Cel</th>
                <th className="text-right py-3 px-2 text-slate-400 font-semibold">Różnica</th>
                {goal.daily_calories_limit && (
                  <th className="text-right py-3 px-2 text-orange-400 font-semibold">Kalorie</th>
                )}
                {goal.daily_steps_goal && (
                  <th className="text-right py-3 px-2 text-blue-400 font-semibold">Kroki</th>
                )}
                <th className="text-center py-3 px-2 text-purple-400 font-semibold">Trening</th>
              </tr>
            </thead>
            <tbody>
              {sortedEntries.map((entry, index) => {
                const targetWeight = getTargetWeight(entry.date);
                const difference = entry.weight - targetWeight;
                const weekNumber = getWeekNumber(entry.date);

                // Check if calories are within limit
                const caloriesOk = goal.daily_calories_limit
                  ? (entry.calories || 0) <= goal.daily_calories_limit
                  : true;

                // Check if steps meet goal
                const stepsOk = goal.daily_steps_goal
                  ? (entry.steps || 0) >= goal.daily_steps_goal
                  : true;

                return (
                  <tr
                    key={entry.id}
                    className={`border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors ${
                      index === 0 ? 'bg-slate-700/20' : ''
                    }`}
                  >
                    <td className="py-3 px-2 text-white">
                      {new Date(entry.date).toLocaleDateString('pl-PL', {
                        weekday: 'short',
                        day: '2-digit',
                        month: '2-digit'
                      })}
                    </td>
                    <td className="py-3 px-2 text-slate-400">
                      Tydz. {weekNumber}
                    </td>
                    <td className="py-3 px-2 text-right">
                      <span className="text-white font-bold">{entry.weight.toFixed(1)} kg</span>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <span className="text-amber-400">{targetWeight.toFixed(1)} kg</span>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <span className={`flex items-center justify-end gap-1 ${
                        difference < 0
                          ? 'text-emerald-400'
                          : difference > 0
                            ? 'text-red-400'
                            : 'text-slate-400'
                      }`}>
                        {difference < 0 ? (
                          <TrendingDown className="w-4 h-4" />
                        ) : difference > 0 ? (
                          <TrendingUp className="w-4 h-4" />
                        ) : (
                          <Minus className="w-4 h-4" />
                        )}
                        {difference > 0 ? '+' : ''}{difference.toFixed(1)} kg
                      </span>
                    </td>
                    {goal.daily_calories_limit && (
                      <td className="py-3 px-2 text-right">
                        {entry.calories ? (
                          <span className={`flex items-center justify-end gap-1 ${
                            caloriesOk ? 'text-emerald-400' : 'text-red-400'
                          }`}>
                            {entry.calories}
                            {caloriesOk ? (
                              <Check className="w-4 h-4" />
                            ) : (
                              <X className="w-4 h-4" />
                            )}
                          </span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                    )}
                    {goal.daily_steps_goal && (
                      <td className="py-3 px-2 text-right">
                        {entry.steps ? (
                          <span className={`flex items-center justify-end gap-1 ${
                            stepsOk ? 'text-emerald-400' : 'text-red-400'
                          }`}>
                            {entry.steps.toLocaleString()}
                            {stepsOk ? (
                              <Check className="w-4 h-4" />
                            ) : (
                              <X className="w-4 h-4" />
                            )}
                          </span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                    )}
                    <td className="py-3 px-2 text-center">
                      {entry.workout ? (
                        <span className="text-purple-400">
                          {entry.workout}
                          {entry.workout_duration && ` (${entry.workout_duration}min)`}
                        </span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary */}
      {sortedEntries.length > 0 && (
        <div className="mt-6 pt-4 border-t border-slate-700">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-slate-400">Waga startowa:</span>
              <span className="text-white font-bold ml-2">{goal.current_weight} kg</span>
            </div>
            <div>
              <span className="text-slate-400">Obecna waga:</span>
              <span className="text-white font-bold ml-2">{sortedEntries[0].weight} kg</span>
            </div>
            <div>
              <span className="text-slate-400">Cel:</span>
              <span className="text-amber-400 font-bold ml-2">{goal.target_weight} kg</span>
            </div>
            <div>
              <span className="text-slate-400">Zmiana:</span>
              <span className={`font-bold ml-2 ${
                sortedEntries[0].weight < goal.current_weight
                  ? 'text-emerald-400'
                  : 'text-red-400'
              }`}>
                {(sortedEntries[0].weight - goal.current_weight).toFixed(1)} kg
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
