// Trend Analysis Utilities for Weight Tracker

export interface Entry {
  date: string;
  weight: number;
  calories?: number;
  steps?: number;
}

export interface TrendData {
  period: string;
  days: number;
  avgWeight: number;
  weightChange: number;
  avgDaily: number; // Average daily change
  trend: "up" | "down" | "stable";
  entries: number;
}

export interface WeeklyTrend {
  weekStart: string;
  avgWeight: number;
  minWeight: number;
  maxWeight: number;
  entries: number;
}

export interface Prediction {
  targetDate: string | null;
  daysRemaining: number | null;
  weeklyRate: number;
  isOnTrack: boolean;
  projectedWeight30Days: number;
  confidence: "high" | "medium" | "low";
}

// Calculate average weight for a period
function getAverageForPeriod(entries: Entry[], days: number): { avg: number; count: number; change: number } {
  const now = new Date();
  now.setHours(23, 59, 59, 999);

  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - days);

  const periodEntries = entries.filter(e => {
    const entryDate = new Date(e.date);
    return entryDate >= cutoff && entryDate <= now;
  });

  if (periodEntries.length === 0) {
    return { avg: 0, count: 0, change: 0 };
  }

  const sorted = [...periodEntries].sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const avg = sorted.reduce((sum, e) => sum + e.weight, 0) / sorted.length;
  const change = sorted.length > 1
    ? sorted[sorted.length - 1].weight - sorted[0].weight
    : 0;

  return { avg, count: sorted.length, change };
}

// Get trend direction
function getTrendDirection(change: number, threshold: number = 0.3): "up" | "down" | "stable" {
  if (change > threshold) return "up";
  if (change < -threshold) return "down";
  return "stable";
}

// Calculate trends for multiple periods
export function calculateTrends(entries: Entry[]): TrendData[] {
  const periods = [
    { label: "7 dni", days: 7 },
    { label: "14 dni", days: 14 },
    { label: "30 dni", days: 30 },
    { label: "90 dni", days: 90 },
  ];

  return periods.map(period => {
    const { avg, count, change } = getAverageForPeriod(entries, period.days);
    const avgDaily = count > 1 ? change / period.days : 0;

    return {
      period: period.label,
      days: period.days,
      avgWeight: avg,
      weightChange: change,
      avgDaily,
      trend: getTrendDirection(change),
      entries: count,
    };
  });
}

// Calculate weekly trends for chart
export function calculateWeeklyTrends(entries: Entry[], weeks: number = 12): WeeklyTrend[] {
  const result: WeeklyTrend[] = [];
  const now = new Date();

  for (let i = 0; i < weeks; i++) {
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() - (i * 7));
    weekEnd.setHours(23, 59, 59, 999);

    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);

    const weekEntries = entries.filter(e => {
      const entryDate = new Date(e.date);
      return entryDate >= weekStart && entryDate <= weekEnd;
    });

    if (weekEntries.length > 0) {
      const weights = weekEntries.map(e => e.weight);
      result.unshift({
        weekStart: weekStart.toISOString().split('T')[0],
        avgWeight: weights.reduce((a, b) => a + b, 0) / weights.length,
        minWeight: Math.min(...weights),
        maxWeight: Math.max(...weights),
        entries: weekEntries.length,
      });
    }
  }

  return result;
}

// Predict goal achievement
export function predictGoalDate(
  entries: Entry[],
  currentWeight: number,
  targetWeight: number,
  targetDate?: string
): Prediction {
  // Get recent trend (last 30 days)
  const { change, count } = getAverageForPeriod(entries, 30);

  // Calculate weekly rate
  const weeklyRate = count > 7 ? (change / 30) * 7 : 0;

  // Project weight in 30 days
  const projectedWeight30Days = currentWeight + (weeklyRate * (30 / 7));

  // Determine confidence based on data availability
  let confidence: "high" | "medium" | "low" = "low";
  if (count >= 20) confidence = "high";
  else if (count >= 10) confidence = "medium";

  // If no consistent trend, can't predict
  if (Math.abs(weeklyRate) < 0.05 || count < 5) {
    return {
      targetDate: null,
      daysRemaining: null,
      weeklyRate: 0,
      isOnTrack: false,
      projectedWeight30Days: currentWeight,
      confidence: "low",
    };
  }

  // Calculate days to reach target
  const weightToLose = currentWeight - targetWeight;
  const dailyRate = weeklyRate / 7;

  // Check if going in right direction
  const isLosingWeight = targetWeight < currentWeight;
  const isTrendingCorrectly = isLosingWeight ? dailyRate < 0 : dailyRate > 0;

  if (!isTrendingCorrectly) {
    return {
      targetDate: null,
      daysRemaining: null,
      weeklyRate,
      isOnTrack: false,
      projectedWeight30Days,
      confidence,
    };
  }

  const daysToTarget = Math.abs(weightToLose / dailyRate);
  const predictedDate = new Date();
  predictedDate.setDate(predictedDate.getDate() + daysToTarget);

  // Check if on track compared to original target date
  let isOnTrack = true;
  if (targetDate) {
    const target = new Date(targetDate);
    isOnTrack = predictedDate <= target;
  }

  return {
    targetDate: predictedDate.toISOString().split('T')[0],
    daysRemaining: Math.round(daysToTarget),
    weeklyRate,
    isOnTrack,
    projectedWeight30Days,
    confidence,
  };
}

// Detect weight plateau (no significant change for N days)
export function detectPlateau(entries: Entry[], days: number = 14): boolean {
  const { change, count } = getAverageForPeriod(entries, days);

  if (count < 5) return false; // Not enough data

  // Plateau if change is less than 0.5kg over the period
  return Math.abs(change) < 0.5;
}

// Calculate moving average
export function calculateMovingAverage(entries: Entry[], windowSize: number = 7): { date: string; value: number }[] {
  const sorted = [...entries].sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const result: { date: string; value: number }[] = [];

  for (let i = windowSize - 1; i < sorted.length; i++) {
    const window = sorted.slice(i - windowSize + 1, i + 1);
    const avg = window.reduce((sum, e) => sum + e.weight, 0) / window.length;
    result.push({
      date: sorted[i].date,
      value: avg,
    });
  }

  return result;
}
