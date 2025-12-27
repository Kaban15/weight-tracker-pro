import { describe, it, expect } from 'vitest'
import {
  formatDate,
  formatDateStr,
  getWeekNumber,
  getWeekDays,
  isDateInRange,
  getDaysBetween,
  iterateDates,
  DAY_NAMES_SHORT,
  MONTH_NAMES
} from '@/app/components/shared/dateUtils'

describe('dateUtils', () => {
  describe('formatDate', () => {
    it('formats date correctly with leading zeros', () => {
      const date = new Date(2024, 0, 5) // January 5, 2024
      expect(formatDate(date)).toBe('2024-01-05')
    })

    it('formats date correctly for double-digit month and day', () => {
      const date = new Date(2024, 11, 25) // December 25, 2024
      expect(formatDate(date)).toBe('2024-12-25')
    })

    it('handles edge cases for months', () => {
      // First month (January)
      expect(formatDate(new Date(2024, 0, 1))).toBe('2024-01-01')
      // Last month (December)
      expect(formatDate(new Date(2024, 11, 31))).toBe('2024-12-31')
    })
  })

  describe('formatDateStr', () => {
    it('is an alias for formatDate', () => {
      const date = new Date(2024, 5, 15)
      expect(formatDateStr(date)).toBe(formatDate(date))
    })
  })

  describe('getWeekNumber', () => {
    it('returns correct week number for start of year', () => {
      const date = new Date(2024, 0, 1)
      expect(getWeekNumber(date)).toBeGreaterThanOrEqual(1)
    })

    it('returns correct week number for middle of year', () => {
      const date = new Date(2024, 5, 15) // Mid June
      const weekNum = getWeekNumber(date)
      expect(weekNum).toBeGreaterThan(20)
      expect(weekNum).toBeLessThan(30)
    })

    it('returns correct week number for end of year', () => {
      const date = new Date(2024, 11, 31)
      expect(getWeekNumber(date)).toBeGreaterThanOrEqual(52)
    })
  })

  describe('getWeekDays', () => {
    it('returns 7 days', () => {
      const days = getWeekDays(0)
      expect(days).toHaveLength(7)
    })

    it('starts with Monday', () => {
      const days = getWeekDays(0)
      // getDay() returns 0 for Sunday, 1 for Monday
      expect(days[0].getDay()).toBe(1)
    })

    it('ends with Sunday', () => {
      const days = getWeekDays(0)
      expect(days[6].getDay()).toBe(0)
    })

    it('returns consecutive days', () => {
      const days = getWeekDays(0)
      for (let i = 1; i < days.length; i++) {
        const diffMs = days[i].getTime() - days[i - 1].getTime()
        const diffDays = diffMs / (24 * 60 * 60 * 1000)
        expect(diffDays).toBe(1)
      }
    })

    it('handles positive offset correctly', () => {
      const thisWeek = getWeekDays(0)
      const nextWeek = getWeekDays(1)
      const diffMs = nextWeek[0].getTime() - thisWeek[0].getTime()
      const diffDays = diffMs / (24 * 60 * 60 * 1000)
      expect(diffDays).toBe(7)
    })

    it('handles negative offset correctly', () => {
      const thisWeek = getWeekDays(0)
      const lastWeek = getWeekDays(-1)
      const diffMs = thisWeek[0].getTime() - lastWeek[0].getTime()
      const diffDays = diffMs / (24 * 60 * 60 * 1000)
      expect(diffDays).toBe(7)
    })
  })

  describe('isDateInRange', () => {
    it('returns true for date within range', () => {
      expect(isDateInRange('2024-06-15', '2024-06-01', '2024-06-30')).toBe(true)
    })

    it('returns true for date at start of range', () => {
      expect(isDateInRange('2024-06-01', '2024-06-01', '2024-06-30')).toBe(true)
    })

    it('returns true for date at end of range', () => {
      expect(isDateInRange('2024-06-30', '2024-06-01', '2024-06-30')).toBe(true)
    })

    it('returns false for date before range', () => {
      expect(isDateInRange('2024-05-31', '2024-06-01', '2024-06-30')).toBe(false)
    })

    it('returns false for date after range', () => {
      expect(isDateInRange('2024-07-01', '2024-06-01', '2024-06-30')).toBe(false)
    })
  })

  describe('getDaysBetween', () => {
    it('returns 1 for same day', () => {
      const date = new Date(2024, 5, 15)
      expect(getDaysBetween(date, date)).toBe(1)
    })

    it('returns correct number for consecutive days', () => {
      const start = new Date(2024, 5, 15)
      const end = new Date(2024, 5, 16)
      expect(getDaysBetween(start, end)).toBe(2)
    })

    it('returns correct number for a week', () => {
      const start = new Date(2024, 5, 15)
      const end = new Date(2024, 5, 21)
      expect(getDaysBetween(start, end)).toBe(7)
    })

    it('returns correct number for a month', () => {
      const start = new Date(2024, 5, 1)
      const end = new Date(2024, 5, 30)
      expect(getDaysBetween(start, end)).toBe(30)
    })
  })

  describe('iterateDates', () => {
    it('yields correct number of dates', () => {
      const start = new Date(2024, 5, 15)
      const end = new Date(2024, 5, 20)
      const dates = [...iterateDates(start, end)]
      expect(dates).toHaveLength(6)
    })

    it('yields dates in correct order', () => {
      const start = new Date(2024, 5, 15)
      const end = new Date(2024, 5, 17)
      const dates = [...iterateDates(start, end)]

      expect(formatDate(dates[0])).toBe('2024-06-15')
      expect(formatDate(dates[1])).toBe('2024-06-16')
      expect(formatDate(dates[2])).toBe('2024-06-17')
    })

    it('does not mutate original dates', () => {
      const start = new Date(2024, 5, 15)
      const end = new Date(2024, 5, 17)
      const originalStartTime = start.getTime()
      const originalEndTime = end.getTime()

      // Consume the iterator
      const dates = [...iterateDates(start, end)]

      expect(start.getTime()).toBe(originalStartTime)
      expect(end.getTime()).toBe(originalEndTime)
    })

    it('returns empty for start after end', () => {
      const start = new Date(2024, 5, 20)
      const end = new Date(2024, 5, 15)
      const dates = [...iterateDates(start, end)]
      expect(dates).toHaveLength(0)
    })
  })

  describe('constants', () => {
    it('DAY_NAMES_SHORT has 7 elements', () => {
      expect(DAY_NAMES_SHORT).toHaveLength(7)
    })

    it('DAY_NAMES_SHORT starts with Monday', () => {
      expect(DAY_NAMES_SHORT[0]).toBe('Pn')
    })

    it('MONTH_NAMES has 12 elements', () => {
      expect(MONTH_NAMES).toHaveLength(12)
    })

    it('MONTH_NAMES starts with January', () => {
      expect(MONTH_NAMES[0]).toBe('Styczeń')
    })

    it('MONTH_NAMES ends with December', () => {
      expect(MONTH_NAMES[11]).toBe('Grudzień')
    })
  })
})
