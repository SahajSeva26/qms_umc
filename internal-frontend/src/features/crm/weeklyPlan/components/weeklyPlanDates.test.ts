import { describe, it, expect } from 'vitest'
import { toNoonIso, toSubmitIso, isOutsideWeek } from './weeklyPlanDates'

// Regression for a P1 IST-shift finding. Asserts the literal string directly — stubbing
// getTimezoneOffset doesn't change how a bare local-time string is parsed, so it can't simulate this.
describe('toNoonIso — produces a literal UTC-noon instant for the given calendar day', () => {
  it('always serializes to exactly T12:00:00.000Z for the given date, with no environment dependency', () => {
    expect(toNoonIso('2026-08-03')).toBe('2026-08-03T12:00:00.000Z')
    expect(toNoonIso('2026-01-01')).toBe('2026-01-01T12:00:00.000Z')
    expect(toNoonIso('2026-12-31')).toBe('2026-12-31T12:00:00.000Z')
  })
})

describe('toSubmitIso — preserves the calendar date on submit, independent of the machine timezone', () => {
  it('keeps the same calendar day the user picked, as a real UTC instant', () => {
    expect(toSubmitIso('2026-08-03')).toBe('2026-08-03T12:00:00.000Z')
  })

  it('stays on the same calendar day at every UTC offset strictly inside ±12h of noon', () => {
    // UTC+14:00 genuinely crosses into the next local day from noon — correct, not a bug.
    const iso = toSubmitIso('2026-08-03')
    const instant = new Date(iso).getTime()
    for (const offsetHours of [-11.5, -5.5, 0, 5.5, 8, 11.5]) {
      const localInstant = instant + offsetHours * 3_600_000
      const localDate = new Date(localInstant)
      expect(localDate.getUTCFullYear()).toBe(2026)
      expect(localDate.getUTCMonth()).toBe(7) // August (0-indexed)
      expect(localDate.getUTCDate()).toBe(3)
    }
  })

  it('produces a valid, parseable ISO string', () => {
    const iso = toSubmitIso('2026-01-01')
    expect(() => new Date(iso)).not.toThrow()
    expect(new Date(iso).toISOString()).toBe(iso)
  })
})

describe('isOutsideWeek — visit date must fall within the plan\'s week', () => {
  it('rejects a visit date before the week start', () => {
    expect(isOutsideWeek('2026-08-02', '2026-08-03', '2026-08-09')).toBe(true)
  })

  it('rejects a visit date after the week end', () => {
    expect(isOutsideWeek('2026-08-10', '2026-08-03', '2026-08-09')).toBe(true)
  })

  it('accepts a visit date on the week boundaries (inclusive)', () => {
    expect(isOutsideWeek('2026-08-03', '2026-08-03', '2026-08-09')).toBe(false)
    expect(isOutsideWeek('2026-08-09', '2026-08-03', '2026-08-09')).toBe(false)
  })

  it('accepts a visit date in the middle of the week', () => {
    expect(isOutsideWeek('2026-08-06', '2026-08-03', '2026-08-09')).toBe(false)
  })

  it('also works when given a full ISO datetime (slices to the date)', () => {
    expect(isOutsideWeek('2026-08-06T09:00:00.000Z', '2026-08-03', '2026-08-09')).toBe(false)
    expect(isOutsideWeek('2026-08-15T09:00:00.000Z', '2026-08-03', '2026-08-09')).toBe(true)
  })
})
