import { describe, it, expect } from 'vitest'
import { voidCampFormSchema } from './voidCamp.schemas'

function validPayload(overrides: Record<string, unknown> = {}) {
  return {
    type: 'screening',
    doctorId: 'doc-1',
    date: '2026-09-20',
    timeSlot: '9am-1pm',
    location: {
      addressLine1: '12 MG Road',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      coordinates: [72.8777, 19.076],
    },
    mailUrl: 'https://mail.example.com/abc',
    ...overrides,
  }
}

describe('voidCampFormSchema', () => {
  it('accepts a fully valid payload', () => {
    expect(voidCampFormSchema.safeParse(validPayload()).success).toBe(true)
  })

  it('rejects a location missing coordinates, even when city/state/pincode/addressLine1 are all filled', () => {
    const payload = validPayload()
    const location = { ...(payload.location as Record<string, unknown>) }
    delete location.coordinates
    const result = voidCampFormSchema.safeParse({ ...payload, location })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.join('.') === 'location.coordinates')).toBe(true)
    }
  })

  it('rejects a location missing addressLine1, even when city/state/pincode/coordinates are all filled', () => {
    const payload = validPayload()
    const location = { ...(payload.location as Record<string, unknown>), addressLine1: '' }
    const result = voidCampFormSchema.safeParse({ ...payload, location })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.join('.') === 'location.addressLine1')).toBe(true)
    }
  })
})
