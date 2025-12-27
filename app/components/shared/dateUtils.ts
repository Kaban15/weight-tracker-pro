/**
 * Shared date utilities for all components
 */

/**
 * Format date to YYYY-MM-DD string
 */
export function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Alias for formatDate (backwards compatibility)
 */
export const formatDateStr = formatDate;

/**
 * Get week number for a given date
 */
export function getWeekNumber(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 1);
  const diff = d.getTime() - start.getTime();
  const oneWeek = 604800000; // 7 * 24 * 60 * 60 * 1000
  return Math.ceil((diff / oneWeek) + 1);
}

/**
 * Get array of 7 dates for a week, starting from Monday
 * @param offset - Week offset from current week (0 = current, -1 = last week, 1 = next week)
 */
export function getWeekDays(offset: number = 0): Date[] {
  const today = new Date();
  const dayOfWeek = today.getDay();
  // Monday = 1, Sunday = 0 (converted to 7)
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset + (offset * 7));

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

/**
 * Check if a date is within a range
 */
export function isDateInRange(dateStr: string, startDate: string, endDate: string): boolean {
  return dateStr >= startDate && dateStr <= endDate;
}

/**
 * Get number of days between two dates
 */
export function getDaysBetween(start: Date, end: Date): number {
  const msPerDay = 86400000; // 24 * 60 * 60 * 1000
  return Math.ceil((end.getTime() - start.getTime()) / msPerDay) + 1;
}

/**
 * Iterate over dates in range (safe - creates new Date objects)
 */
export function* iterateDates(start: Date, end: Date): Generator<Date> {
  const msPerDay = 86400000;
  for (let d = new Date(start); d <= end; d = new Date(d.getTime() + msPerDay)) {
    yield d;
  }
}

/**
 * Polish day names (short)
 */
export const DAY_NAMES_SHORT = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd'];

/**
 * Polish day names (medium)
 */
export const DAY_NAMES_MEDIUM = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Ndz'];

/**
 * Polish month names
 */
export const MONTH_NAMES = [
  'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
];
