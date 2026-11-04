import { describe, it, expect } from 'vitest'
import { isPendingClosure, CAMP_STATUS_TONE, CAMP_STATUS_LABEL } from './fieldWorkspace.utils'

describe('isPendingClosure', () => {
  it('is true for a past-dated camp still in a non-terminal status', () => {
    expect(isPendingClosure('2020-01-01', 'confirmed')).toBe(true)
    expect(isPendingClosure('2020-01-01', 'live')).toBe(true)
    expect(isPendingClosure('2020-01-01', 'requested')).toBe(true)
  })

  it('is false once the camp has reached a terminal status, even if past-dated', () => {
    expect(isPendingClosure('2020-01-01', 'closed')).toBe(false)
    expect(isPendingClosure('2020-01-01', 'cancelled')).toBe(false)
    expect(isPendingClosure('2020-01-01', 'cancelled_charged')).toBe(false)
  })

  it('is false for a future-dated camp regardless of status', () => {
    const future = new Date(Date.now() + 30 * 86_400_000).toISOString()
    expect(isPendingClosure(future, 'confirmed')).toBe(false)
    expect(isPendingClosure(future, 'live')).toBe(false)
  })
})

describe('CAMP_STATUS_TONE / CAMP_STATUS_LABEL', () => {
  it('covers every real CampStatus value with no invented statuses', () => {
    const statuses = ['requested', 'confirmed', 'live', 'closed', 'cancelled', 'cancelled_charged'] as const
    for (const status of statuses) {
      expect(CAMP_STATUS_TONE[status]).toBeDefined()
      expect(CAMP_STATUS_LABEL[status]).toBeDefined()
    }
  })
})
