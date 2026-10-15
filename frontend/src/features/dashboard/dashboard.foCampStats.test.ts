import { describe, it, expect } from 'vitest'
import { buildFoRegionalSpread, buildFoTimeSlotBifurcation } from './dashboard.foCampStats'
import type { CampEntity } from '@/types/campReal.types'
import type { LocationValue } from '@/types/location.types'

function camp(overrides: Partial<CampEntity> = {}): CampEntity {
  return {
    id: 'c', code: 'c', tenant: 'x', division: 'x', project: null, doctor: 'x',
    type: 'screening', billingType: 'billable', patientExpectation: 0,
    fo: null, dietitian: null, mr: null, asm: null, rsm: null,
    date: new Date().toISOString(), timeSlot: null, location: null,
    devices: [], meta: null, status: 'closed', stageHistory: [],
    createdAt: '', updatedAt: '',
    ...overrides,
  } as CampEntity
}

function location(city: string, state: string): LocationValue {
  return { addressLine1: 'x', city, state, pincode: '000000' }
}

describe('buildFoRegionalSpread', () => {
  it('groups camps by their real state, mapped to the correct zone, and dedupes FO ids within a region', () => {
    const camps = [
      camp({ location: location('Mumbai', 'Maharashtra'), fo: { _id: 'fo1', code: 'fo1', name: 'A' } }),
      camp({ location: location('Pune', 'Maharashtra'), fo: { _id: 'fo1', code: 'fo1', name: 'A' } }),
      camp({ location: location('Chennai', 'Tamil Nadu'), fo: { _id: 'fo2', code: 'fo2', name: 'B' } }),
    ]

    const rows = buildFoRegionalSpread(camps)

    const west = rows.find((r) => r.region === 'West')!
    expect(west.camps).toBe(2)
    expect(west.fos).toBe(1) // same FO on both Maharashtra camps — deduped, not double-counted

    const south = rows.find((r) => r.region === 'South')!
    expect(south.camps).toBe(1)
    expect(south.fos).toBe(1)
  })

  it('buckets an unrecognized state string as "Other" rather than dropping or crashing', () => {
    const camps = [camp({ location: location('X', 'Atlantis') })]
    const rows = buildFoRegionalSpread(camps)
    expect(rows.find((r) => r.region === 'Other')?.camps).toBe(1)
  })

  it('excludes camps with no location rather than fabricating a region', () => {
    const camps = [camp({ location: null })]
    const rows = buildFoRegionalSpread(camps)
    expect(rows.length).toBe(0)
  })
})

describe('buildFoTimeSlotBifurcation', () => {
  it('counts real camps by their actual timeSlot, covering all 4 real slots even when some have zero', () => {
    const camps = [
      camp({ timeSlot: '9am-1pm' }),
      camp({ timeSlot: '9am-1pm' }),
      camp({ timeSlot: '6pm-10pm' }),
    ]

    const rows = buildFoTimeSlotBifurcation(camps)

    expect(rows.length).toBe(4)
    expect(rows.find((r) => r.slot === '9 AM – 1 PM')?.count).toBe(2)
    expect(rows.find((r) => r.slot === '6 PM – 10 PM')?.count).toBe(1)
    expect(rows.find((r) => r.slot === '10 AM – 2 PM')?.count).toBe(0)
  })

  it('excludes camps with no timeSlot from the share denominator', () => {
    const camps = [camp({ timeSlot: '9am-1pm' }), camp({ timeSlot: null })]
    const rows = buildFoTimeSlotBifurcation(camps)
    expect(rows.find((r) => r.slot === '9 AM – 1 PM')?.share).toBe(100)
  })
})
