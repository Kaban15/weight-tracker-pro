"use client";

import { useMemo } from "react";
import {
  TrendingDown,
  TrendingUp,
  Minus,
  Target,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
} from "lucide-react";
import {
  calculateTrends,
  predictGoalDate,
  detectPlateau,
  TrendData,
  Prediction,
} from "@/lib/trendAnalysis";
import { Entry, Goal } from "./types";

interface TrendAnalysisProps {
  entries: Entry[];
  goal?: Goal | null;
  currentWeight: number;
}

function TrendIcon({ trend }: { trend: "up" | "down" | "stable" }) {
  if (trend === "down") {
    return <TrendingDown className="w-5 h-5 text-emerald-400" />;
  }
  if (trend === "up") {
    return <TrendingUp className="w-5 h-5 text-rose-400" />;
  }
  return <Minus className="w-5 h-5 text-slate-400" />;
}

function TrendCard({ trend }: { trend: TrendData }) {
  const trendColor =
    trend.trend === "down"
      ? "text-emerald-400"
      : trend.trend === "up"
      ? "text-rose-400"
      : "text-slate-400";

  const bgColor =
    trend.trend === "down"
      ? "from-emerald-600/10 to-emerald-600/5 border-emerald-500/20"
      : trend.trend === "up"
      ? "from-rose-600/10 to-rose-600/5 border-rose-500/20"
      : "from-slate-600/10 to-slate-600/5 border-slate-500/20";

  if (trend.entries === 0) {
    return (
      <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
        <div className="text-slate-500 text-sm mb-1">{trend.period}</div>
        <div className="text-slate-600 text-lg">Brak danych</div>
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-br ${bgColor} rounded-xl p-4 border`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-slate-400 text-sm font-medium">{trend.period}</span>
        <TrendIcon trend={trend.trend} />
      </div>
      <div className="text-2xl font-bold text-white mb-1">
        {trend.avgWeight.toFixed(1)} kg
      </div>
      <div className={`text-sm ${trendColor} font-medium`}>
        {trend.weightChange > 0 ? "+" : ""}
        {trend.weightChange.toFixed(2)} kg
      </div>
      <div className="text-xs text-slate-500 mt-1">
        {trend.entries} {trend.entries === 1 ? "wpis" : trend.entries < 5 ? "wpisy" : "wpisów"}
      </div>
    </div>
  );
}

function PredictionCard({ prediction, goal }: { prediction: Prediction; goal?: Goal | null }) {
  if (!prediction.targetDate) {
    return (
      <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center">
            <Target className="w-5 h-5 text-slate-400" />
          </div>
          <div>
            <h4 className="text-white font-semibold">Predykcja celu</h4>
            <p className="text-slate-500 text-sm">Niewystarczające dane</p>
          </div>
        </div>
        <p className="text-slate-400 text-sm">
          Potrzeba więcej wpisów, aby obliczyć przewidywaną datę osiągnięcia celu.
          Zapisuj wagę regularnie przez co najmniej 2 tygodnie.
        </p>
      </div>
    );
  }

  const confidenceColors = {
    high: "text-emerald-400",
    medium: "text-amber-400",
    low: "text-slate-400",
  };

  const confidenceLabels = {
    high: "Wysoka pewność",
    medium: "Średnia pewność",
    low: "Niska pewność",
  };

  return (
    <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              prediction.isOnTrack ? "bg-emerald-600/20" : "bg-amber-600/20"
            }`}
          >
            {prediction.isOnTrack ? (
              <CheckCircle className="w-5 h-5 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            )}
          </div>
          <div>
            <h4 className="text-white font-semibold">Predykcja celu</h4>
            <p className={`text-sm ${confidenceColors[prediction.confidence]}`}>
              {confidenceLabels[prediction.confidence]}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div className="text-slate-400 text-xs mb-1">Przewidywana data</div>
          <div className="text-white font-semibold flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-400" />
            {new Date(prediction.targetDate).toLocaleDateString("pl-PL", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </div>
        </div>
        <div>
          <div className="text-slate-400 text-xs mb-1">Pozostało dni</div>
          <div className="text-white font-semibold flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-400" />
            {prediction.daysRemaining}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-slate-400 text-xs mb-1">Tempo tygodniowe</div>
          <div
            className={`font-semibold ${
              prediction.weeklyRate < 0 ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {prediction.weeklyRate > 0 ? "+" : ""}
            {prediction.weeklyRate.toFixed(2)} kg/tydz.
          </div>
        </div>
        <div>
          <div className="text-slate-400 text-xs mb-1">Waga za 30 dni</div>
          <div className="text-white font-semibold">
            ~{prediction.projectedWeight30Days.toFixed(1)} kg
          </div>
        </div>
      </div>

      {goal?.target_date && !prediction.isOnTrack && (
        <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <p className="text-amber-400 text-sm">
            Przy obecnym tempie nie osiągniesz celu {goal.target_weight} kg do{" "}
            {new Date(goal.target_date).toLocaleDateString("pl-PL")}.
          </p>
        </div>
      )}
    </div>
  );
}

export default function TrendAnalysis({ entries, goal, currentWeight }: TrendAnalysisProps) {
  const trends = useMemo(() => calculateTrends(entries), [entries]);

  const prediction = useMemo(() => {
    if (!goal) return null;
    return predictGoalDate(
      entries,
      currentWeight,
      goal.target_weight,
      goal.target_date
    );
  }, [entries, currentWeight, goal]);

  const isPlateau = useMemo(() => detectPlateau(entries), [entries]);

  if (entries.length < 3) {
    return (
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 text-center">
        <BarChart3 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
        <h3 className="text-white font-semibold mb-2">Analiza trendów</h3>
        <p className="text-slate-400 text-sm">
          Dodaj więcej wpisów, aby zobaczyć analizę trendów.
          Potrzeba minimum 3 wpisów.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Plateau Warning */}
      {isPlateau && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-amber-400 font-semibold mb-1">Wykryto plateau</h4>
            <p className="text-slate-300 text-sm">
              Twoja waga nie zmienia się znacząco od 2 tygodni. Rozważ modyfikację
              diety lub intensywności treningów.
            </p>
          </div>
        </div>
      )}

      {/* Period Trends */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-emerald-400" />
          Średnie wagi
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {trends.map((trend) => (
            <TrendCard key={trend.period} trend={trend} />
          ))}
        </div>
      </div>

      {/* Prediction */}
      {goal && prediction && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-emerald-400" />
            Analiza celu
          </h3>
          <PredictionCard prediction={prediction} goal={goal} />
        </div>
      )}

      {/* Weekly Summary */}
      {trends[0].entries > 0 && (
        <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
          <h4 className="text-white font-semibold mb-3">Podsumowanie tygodnia</h4>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-white">
                {trends[0].avgWeight.toFixed(1)}
              </div>
              <div className="text-slate-400 text-xs">Śr. waga (kg)</div>
            </div>
            <div>
              <div
                className={`text-2xl font-bold ${
                  trends[0].weightChange < 0 ? "text-emerald-400" : trends[0].weightChange > 0 ? "text-rose-400" : "text-slate-400"
                }`}
              >
                {trends[0].weightChange > 0 ? "+" : ""}
                {trends[0].weightChange.toFixed(2)}
              </div>
              <div className="text-slate-400 text-xs">Zmiana (kg)</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{trends[0].entries}</div>
              <div className="text-slate-400 text-xs">Wpisów</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
