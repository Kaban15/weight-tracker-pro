import { Entry, Stats, formatDate } from './types';

export function calculateStatsForEntries(entries: Entry[], goalTargetWeight?: number): Stats & { currentWeight: number; totalWeightChange: number } {
  if (entries.length === 0) {
    return {
      totalEntries: 0, avgWeight: 0, avgCalories: 0, avgSteps: 0,
      totalWorkouts: 0, currentStreak: 0, bestWeight: 0, totalWeightChange: 0,
      currentWeight: 0
    };
  }

  const sortedEntries = [...entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const currentWeight = sortedEntries[sortedEntries.length - 1]!.weight;
  const startWeight = sortedEntries[0]!.weight;
  const entriesWithCalories = sortedEntries.filter(e => e.calories);
  const entriesWithSteps = sortedEntries.filter(e => e.steps);
  const entriesWithWorkout = sortedEntries.filter(e => e.workout);

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < 365; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(today.getDate() - i);
    const dateStr = formatDate(checkDate);
    if (entries.some(e => e.date === dateStr)) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }

  const isLosingWeight = goalTargetWeight !== undefined && goalTargetWeight < startWeight;

  return {
    totalEntries: entries.length,
    avgWeight: sortedEntries.reduce((sum, e) => sum + e.weight, 0) / entries.length,
    avgCalories: entriesWithCalories.length > 0
      ? entriesWithCalories.reduce((sum, e) => sum + (e.calories || 0), 0) / entriesWithCalories.length : 0,
    avgSteps: entriesWithSteps.length > 0
      ? entriesWithSteps.reduce((sum, e) => sum + (e.steps || 0), 0) / entriesWithSteps.length : 0,
    totalWorkouts: entriesWithWorkout.length,
    currentStreak: streak,
    bestWeight: isLosingWeight
      ? Math.min(...sortedEntries.map(e => e.weight))
      : Math.max(...sortedEntries.map(e => e.weight)),
    totalWeightChange: currentWeight - startWeight,
    currentWeight
  };
}
