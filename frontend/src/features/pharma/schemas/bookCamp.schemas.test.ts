import { describe, it, expect } from 'vitest'
import { bookCampPayloadSchema } from '@/features/pharma/schemas/bookCamp.schemas'

const BASE_PAYLOAD = {
  doctor: 'doctor-1',
  date: '2026-09-15',
  timeSlot: { start: '10:00', end: '13:00' },
  city: 'Pune',
  state: 'Maharashtra',
  coordinates: [73.8567, 18.5204] as [number, number],
}

describe('bookCampPayloadSchema', () => {
  it('requires mr when mrRequired is true (HO/RSM/ASM booking on behalf of an MR)', () => {
    const result = bookCampPayloadSchema(true).safeParse(BASE_PAYLOAD)
    expect(result.success).toBe(false)
    if (!result.success) {
      const mrIssue = result.error.issues.find((i) => i.path.join('.') === 'mr')
      expect(mrIssue).toBeDefined()
    }
  })

  it('accepts a payload with mr set when mrRequired is true', () => {
    const result = bookCampPayloadSchema(true).safeParse({ ...BASE_PAYLOAD, mr: 'mr-role-1' })
    expect(result.success).toBe(true)
  })

  it('does not require mr when mrRequired is false (MR booking for themselves)', () => {
    const result = bookCampPayloadSchema(false).safeParse(BASE_PAYLOAD)
    expect(result.success).toBe(true)
  })

  it('rejects a date that is not YYYY-MM-DD', () => {
    const result = bookCampPayloadSchema(false).safeParse({ ...BASE_PAYLOAD, date: '15-09-2026' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const dateIssue = result.error.issues.find((i) => i.path.join('.') === 'date')
      expect(dateIssue?.message).toMatch(/YYYY-MM-DD/i)
    }
  })

  it('rejects an ISO datetime string for date (only the plain date part is valid)', () => {
    const result = bookCampPayloadSchema(false).safeParse({ ...BASE_PAYLOAD, date: '2026-09-15T00:00:00.000Z' })
    expect(result.success).toBe(false)
  })

  it('accepts a valid YYYY-MM-DD date', () => {
    const result = bookCampPayloadSchema(false).safeParse({ ...BASE_PAYLOAD, date: '2026-09-15' })
    expect(result.success).toBe(true)
  })

  it('preserves conscentPath\'s misspelling and every other field name exactly, matching BookCampPayloadSchema on the backend', () => {
    const fullPayload = {
      ...BASE_PAYLOAD,
      mr: 'mr-role-1',
      type: 'screening' as const,
      patientExpectation: 0,
      devices: ['bp-monitor'],
      notes: 'bring extra kits',
      conscentPath: '/uploads/consent-1.pdf',
    }
    const result = bookCampPayloadSchema(true).safeParse(fullPayload)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(Object.keys(result.data).sort()).toEqual(
        ['mr', 'doctor', 'type', 'patientExpectation', 'date', 'timeSlot', 'city', 'state', 'coordinates', 'devices', 'notes', 'conscentPath'].sort(),
      )
    }
  })

  it('accepts patientExpectation: 0 as a genuine value, distinct from omitting it', () => {
    const result = bookCampPayloadSchema(false).safeParse({ ...BASE_PAYLOAD, patientExpectation: 0 })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.patientExpectation).toBe(0)
    }
  })
})
