"use client";

import { Trophy } from "lucide-react";
import { Challenge, getChallengeProgress } from "./index";

interface HistoryItemProps {
  challenge: Challenge;
  onClick: () => void;
}

function HistoryItem({ challenge, onClick }: HistoryItemProps) {
  const progress = getChallengeProgress(challenge);

  return (
    <button
      onClick={onClick}
      className="w-full bg-slate-800/50 rounded-xl border border-slate-700 p-4 hover:bg-slate-700/50 transition-colors text-left"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white truncate">{challenge.name}</h3>
          <p className="text-xs text-slate-500">
            {challenge.startDate} - {challenge.endDate}
          </p>
        </div>
        <div className="flex items-center gap-2 ml-4">
          {progress.percentage >= 100 ? (
            <div className="flex items-center gap-1 bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-lg">
              <Trophy className="w-4 h-4" />
              <span className="text-sm font-medium">100%</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 bg-slate-700 text-slate-300 px-2 py-1 rounded-lg">
              <span className="text-sm font-medium">{progress.percentage}%</span>
            </div>
          )}
        </div>
      </div>
      <div className="mt-2 h-2 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${progress.percentage >= 100 ? 'bg-emerald-500' : 'bg-amber-500'}`}
          style={{ width: `${progress.percentage}%` }}
        />
      </div>
    </button>
  );
}

interface ChallengeHistoryListProps {
  challenges: Challenge[];
  onChallengeClick: (challenge: Challenge) => void;
}

export default function ChallengeHistoryList({ challenges, onChallengeClick }: ChallengeHistoryListProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {challenges.map(challenge => (
        <HistoryItem
          key={challenge.id}
          challenge={challenge}
          onClick={() => onChallengeClick(challenge)}
        />
      ))}
    </div>
  );
}
