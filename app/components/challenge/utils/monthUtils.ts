/**
 * Utility for building month calendar data used in the challenge matrix.
 *
 * Returns all days of a month organized by weeks.
 * - First week starts from day 1 (no previous month days)
 * - Middle weeks are Mon–Sun
 * - Last week ends on the last day of the month
 */
export function getMonthDays(year: number, month: number): { weeks: Date[][]; weekDayOffsets: number[] } {
  const firstDay = new Date(year, month, 1);
  const weeks: Date[][] = [];
  const weekDayOffsets: number[] = []; // Which day of week each week starts on (0=Mon, 6=Sun)

  let currentDate = new Date(firstDay);

  // First week: starts from day 1, ends on Sunday
  const firstWeek: Date[] = [];
  const firstDayOfWeek = currentDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
  // Convert to Monday-based index (0 = Monday, 6 = Sunday)
  const mondayBasedIndex = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
  weekDayOffsets.push(mondayBasedIndex);

  // Add days until Sunday (or end of month)
  while (true) {
    firstWeek.push(new Date(currentDate));
    const dayOfWeek = currentDate.getDay();
    currentDate.setDate(currentDate.getDate() + 1);

    // Stop if we reached Sunday or end of month
    if (dayOfWeek === 0 || currentDate.getMonth() !== month) {
      break;
    }
  }
  weeks.push(firstWeek);

  // Middle and last weeks: Mon-Sun (or until end of month)
  while (currentDate.getMonth() === month) {
    const week: Date[] = [];
    weekDayOffsets.push(0); // These weeks always start on Monday

    for (let i = 0; i < 7 && currentDate.getMonth() === month; i++) {
      week.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    weeks.push(week);
  }

  return { weeks, weekDayOffsets };
}
