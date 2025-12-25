"use client";

import { Edit2, Trash2, Flame } from "lucide-react";
import { Challenge, ChallengeProgress } from "./types";

interface ChallengeCardProps {
  challenge: Challenge;
  progress: ChallengeProgress;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export default function ChallengeCard({
  challenge,
  progress,
  onClick,
  onEdit,
  onDelete
}: ChallengeCardProps) {
  return (
    <div
      className="bg-slate-800/50 rounded-xl border-2 border-slate-700 p-4 hover:border-amber-500/50 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-lg font-semibold text-white">{challenge.name}</h3>
          <p className="text-slate-400 text-sm">
            {challenge.startDate} - {challenge.endDate}
          </p>
        </div>
        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
          <button
            onClick={onEdit}
            className="text-slate-400 hover:text-amber-400 p-1"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="text-slate-400 hover:text-rose-400 p-1"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="h-2 bg-slate-700 rounded-full overflow-hidden mb-2">
        <div
          className={`h-full transition-all ${progress.isCompleted ? 'bg-emerald-500' : 'bg-amber-500'}`}
          style={{ width: `${progress.percentage}%` }}
        />
      </div>

      <div className="flex justify-between text-sm">
        <div className="flex items-center gap-3">
          <span className="text-slate-400">
            {progress.completedCount}/{progress.totalDays} dni
          </span>
          {progress.streak > 0 && (
            <span className="flex items-center gap-1 text-orange-400">
              <Flame className="w-3 h-3" /> {progress.streak}
            </span>
          )}
          {challenge.trackReps && progress.totalReps > 0 && (
            <span className="text-emerald-400 font-medium">
              {progress.totalReps} pow.
            </span>
          )}
        </div>
        <span className={progress.isCompleted ? 'text-emerald-400' : 'text-amber-400'}>
          {progress.percentage}%
        </span>
      </div>
    </div>
  );
}
