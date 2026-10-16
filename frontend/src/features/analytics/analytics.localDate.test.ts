import { describe, it, expect, vi, afterEach } from 'vitest'
import { toLocalDateString, todayLocalDateString, periodStartLocalDateString } from './analytics.localDate'

describe('toLocalDateString', () => {
  it('formats local year/month/day as YYYY-MM-DD, zero-padded', () => {
    expect(toLocalDateString(new Date(2026, 0, 5))).toBe('2026-01-05')
    expect(toLocalDateString(new Date(2026, 11, 31))).toBe('2026-12-31')
  })

  it('reads local date components, not UTC ones — never calls toISOString()', () => {
    // A Date constructed from local (year, month, day, hour, minute) components always reports
    // those SAME local components back via getFullYear/getMonth/getDate, in every timezone the
    // test runs in — this doesn't depend on the worker's actual TZ at all.
    const nearMidnight = new Date(2026, 0, 1, 23, 59)
    expect(toLocalDateString(nearMidnight)).toBe('2026-01-01')

    // Proves the implementation genuinely goes through getFullYear/getMonth/getDate rather than
    // toISOString() — a regression back to toISOString() would call this spy and fail the test
    // (and would also produce the wrong date in any non-UTC timezone, which this doesn't need to
    // assert on since the spy check alone is sufficient and timezone-independent).
    const isoSpy = vi.spyOn(Date.prototype, 'toISOString')
    toLocalDateString(nearMidnight)
    expect(isoSpy).not.toHaveBeenCalled()
    isoSpy.mockRestore()
  })
})

describe('todayLocalDateString / periodStartLocalDateString', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('todayLocalDateString reflects whatever "now" resolves to, via local components', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 2, 15, 10, 0)) // local 2026-03-15 10:00, whatever TZ the worker runs in

    expect(todayLocalDateString()).toBe('2026-03-15')
  })

  it('periodStartLocalDateString counts back periodDays-1 from local today, inclusive', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 2, 15, 10, 0)) // local 2026-03-15

    expect(periodStartLocalDateString(1)).toBe('2026-03-15')
    expect(periodStartLocalDateString(30)).toBe('2026-02-14')
  })

  it('periodStartLocalDateString correctly crosses a year boundary', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 0, 5, 10, 0)) // local 2026-01-05

    expect(periodStartLocalDateString(10)).toBe('2025-12-27')
  })
})
