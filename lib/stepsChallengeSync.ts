// lib/stepsChallengeSync.ts
import type { Challenge } from '@/app/components/challenge/types';

/**
 * Finds active step-tracking challenges and syncs steps from weight tracker entries.
 */

function isStepsChallenge(challenge: Challenge): boolean {
  const name = challenge.name.toLowerCase();
  const unit = challenge.goalUnit?.toLowerCase() || '';
  return name.includes('krok') || unit.includes('krok');
}

function isActiveOnDate(challenge: Challenge, dateStr: string): boolean {
  return dateStr >= challenge.startDate && dateStr <= challenge.endDate;
}

export function findMatchingStepsChallenges(challenges: Challenge[], dateStr: string): Challenge[] {
  return challenges.filter(c => isStepsChallenge(c) && isActiveOnDate(c, dateStr) && c.trackReps);
}

export async function syncStepsToChallenges(
  steps: number,
  dateStr: string,
  challenges: Challenge[],
  updateCompletedDay: (challengeId: string, dateStr: string, reps: number | null) => Promise<void>
): Promise<string[]> {
  const matching = findMatchingStepsChallenges(challenges, dateStr);
  if (matching.length === 0) return [];

  const synced: string[] = [];
  for (const challenge of matching) {
    await updateCompletedDay(challenge.id, dateStr, steps);
    synced.push(challenge.name);
  }
  return synced;
}
