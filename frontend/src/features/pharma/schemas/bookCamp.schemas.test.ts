import { describe, it, expect } from 'vitest'
import { bookCampPayloadSchema } from '@/features/pharma/schemas/bookCamp.schemas'

const BASE_PAYLOAD = {
  doctor: 'doctor-1',
  date: '2026-09-15',
  timeSlot: '9am-1pm' as const,
  location: {
    addressLine1: '221 Baker Street',
    city: 'Pune',
    state: 'Maharashtra',
    pincode: '411001',
    coordinates: [73.8567, 18.5204] as [number, number],
  },
}

describe('bookCampPayloadSchema', () => {
  it('requires mr unconditionally — even an MR booking for themselves must supply it', () => {
    const result = bookCampPayloadSchema.safeParse(BASE_PAYLOAD)
    expect(result.success).toBe(false)
    if (!result.success) {
      const mrIssue = result.error.issues.find((i) => i.path.join('.') === 'mr')
      expect(mrIssue).toBeDefined()
    }
  })

  it('accepts a payload with mr set', () => {
    const result = bookCampPayloadSchema.safeParse({ ...BASE_PAYLOAD, mr: 'mr-role-1' })
    expect(result.success).toBe(true)
  })

  it('rejects a timeSlot that is not one of the 4 fixed values', () => {
    const result = bookCampPayloadSchema.safeParse({ ...BASE_PAYLOAD, mr: 'mr-role-1', timeSlot: '10:00-13:00' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const slotIssue = result.error.issues.find((i) => i.path.join('.') === 'timeSlot')
      expect(slotIssue).toBeDefined()
    }
  })

  it('accepts each of the 4 valid timeSlot values', () => {
    for (const slot of ['9am-1pm', '10am-2pm', '11am-3pm', '6pm-10pm'] as const) {
      const result = bookCampPayloadSchema.safeParse({ ...BASE_PAYLOAD, mr: 'mr-role-1', timeSlot: slot })
      expect(result.success).toBe(true)
    }
  })

  it('rejects a date that is not YYYY-MM-DD', () => {
    const result = bookCampPayloadSchema.safeParse({ ...BASE_PAYLOAD, mr: 'mr-role-1', date: '15-09-2026' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const dateIssue = result.error.issues.find((i) => i.path.join('.') === 'date')
      expect(dateIssue?.message).toMatch(/YYYY-MM-DD/i)
    }
  })

  it('rejects an ISO datetime string for date (only the plain date part is valid)', () => {
    const result = bookCampPayloadSchema.safeParse({ ...BASE_PAYLOAD, mr: 'mr-role-1', date: '2026-09-15T00:00:00.000Z' })
    expect(result.success).toBe(false)
  })

  it('accepts a valid YYYY-MM-DD date', () => {
    const result = bookCampPayloadSchema.safeParse({ ...BASE_PAYLOAD, mr: 'mr-role-1', date: '2026-09-15' })
    expect(result.success).toBe(true)
  })

  it('preserves conscentPath\'s misspelling and every other field name exactly, matching BookCampPayloadSchema on the backend', () => {
    const fullPayload = {
      ...BASE_PAYLOAD,
      mr: 'mr-role-1',
      type: 'screening' as const,
      patientExpectation: 0,
      devices: ['665f0c3a1a2b3c4d5e6f7a90'],
      notes: 'bring extra kits',
      conscentPath: '/uploads/consent-1.pdf',
    }
    const result = bookCampPayloadSchema.safeParse(fullPayload)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(Object.keys(result.data).sort()).toEqual(
        ['mr', 'doctor', 'type', 'patientExpectation', 'date', 'timeSlot', 'location', 'devices', 'notes', 'conscentPath'].sort(),
      )
      expect(Object.keys(result.data.location).sort()).toEqual(
        ['addressLine1', 'city', 'state', 'pincode', 'coordinates'].sort(),
      )
    }
  })

  it('rejects a location missing required fields (city)', () => {
    const result = bookCampPayloadSchema.safeParse({
      ...BASE_PAYLOAD,
      mr: 'mr-role-1',
      location: { ...BASE_PAYLOAD.location, city: '' },
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const cityIssue = result.error.issues.find((i) => i.path.join('.') === 'location.city')
      expect(cityIssue).toBeDefined()
    }
  })

  it('accepts a location with no country — country is genuinely optional, not required-with-default', () => {
    const result = bookCampPayloadSchema.safeParse({ ...BASE_PAYLOAD, mr: 'mr-role-1' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.location.country).toBeUndefined()
    }
  })

  it('rejects a location with an out-of-range coordinate', () => {
    const result = bookCampPayloadSchema.safeParse({
      ...BASE_PAYLOAD,
      mr: 'mr-role-1',
      location: { ...BASE_PAYLOAD.location, coordinates: [200, 18.5204] },
    })
    expect(result.success).toBe(false)
  })

  it('accepts patientExpectation: 0 as a genuine value, distinct from omitting it', () => {
    const result = bookCampPayloadSchema.safeParse({ ...BASE_PAYLOAD, mr: 'mr-role-1', patientExpectation: 0 })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.patientExpectation).toBe(0)
    }
  })
})
