import { describe, it, expect } from 'vitest'
import { startOfWeek, addDays, isSameDay, dayKey } from '@/utils/calendarDate'

describe('calendarDate', () => {
  describe('startOfWeek', () => {
    it('rolls a mid-week date back to Monday, local midnight', () => {
      const wed = new Date(2026, 8, 9, 15, 30) // Wed 9 Sep 2026, 15:30
      const mon = startOfWeek(wed)
      expect(mon.getDay()).toBe(1)
      expect(mon.getDate()).toBe(7)
      expect(mon.getHours()).toBe(0)
      expect(mon.getMinutes()).toBe(0)
    })

    it('a Monday stays on itself', () => {
      const mon = new Date(2026, 8, 7, 12, 0)
      const result = startOfWeek(mon)
      expect(result.getDate()).toBe(7)
    })

    it('a Sunday rolls back to the Monday 6 days earlier', () => {
      const sun = new Date(2026, 8, 13, 9, 0) // Sun 13 Sep 2026
      const result = startOfWeek(sun)
      expect(result.getDay()).toBe(1)
      expect(result.getDate()).toBe(7)
    })
  })

  describe('addDays', () => {
    it('adds days within a month', () => {
      const d = addDays(new Date(2026, 8, 1), 5)
      expect(d.getDate()).toBe(6)
      expect(d.getMonth()).toBe(8)
    })

    it('rolls over a month boundary', () => {
      const d = addDays(new Date(2026, 8, 29), 3)
      expect(d.getMonth()).toBe(9)
      expect(d.getDate()).toBe(2)
    })

    it('rolls over a year boundary', () => {
      const d = addDays(new Date(2026, 11, 30), 3)
      expect(d.getFullYear()).toBe(2027)
      expect(d.getMonth()).toBe(0)
      expect(d.getDate()).toBe(2)
    })

    it('supports negative deltas', () => {
      const d = addDays(new Date(2026, 8, 1), -1)
      expect(d.getMonth()).toBe(7)
      expect(d.getDate()).toBe(31)
    })
  })

  describe('isSameDay', () => {
    it('is true for two Date instances on the same calendar day, different times', () => {
      const a = new Date(2026, 8, 9, 1, 0)
      const b = new Date(2026, 8, 9, 23, 59)
      expect(isSameDay(a, b)).toBe(true)
    })

    it('is false across a day boundary even by one millisecond', () => {
      const a = new Date(2026, 8, 9, 23, 59, 59, 999)
      const b = new Date(2026, 8, 10, 0, 0, 0, 0)
      expect(isSameDay(a, b)).toBe(false)
    })
  })

  describe('dayKey', () => {
    it('zero-pads single-digit month and day', () => {
      expect(dayKey(new Date(2026, 0, 5))).toBe('2026-01-05')
    })

    it('does not zero-pad two-digit month/day', () => {
      expect(dayKey(new Date(2026, 10, 25))).toBe('2026-11-25')
    })
  })
})
