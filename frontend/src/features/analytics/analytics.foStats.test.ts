import { describe, it, expect } from 'vitest'
import { buildFoLeaderboard, buildFoRegionSpread } from './analytics.foStats'
import type { InventoryAssignmentReportFieldOfficer } from '@/types/inventoryAssignment.types'
import type { CampEntity } from '@/types/campReal.types'
import type { GeoProfileEntity } from '@/types/geoProfile.types'

function fo(role: string, name: string, code: string): InventoryAssignmentReportFieldOfficer {
  return { role, name, code, devicesHeld: 0, consumableUnitsHeld: 0, awaitingApproval: 0, awaitingReceipt: 0 }
}

function camp(foRole: string | null, status: CampEntity['status'], stats?: CampEntity['stats']): CampEntity {
  return {
    id: `c-${Math.random()}`, code: 'c', tenant: 't', division: 'd', project: null, doctor: 'doc',
    type: 'screening', billingType: 'billable', patientExpectation: 0,
    fo: foRole ? { _id: foRole, code: 'fo', name: 'x' } : null,
    dietitian: null, mr: null, asm: null, rsm: null,
    date: '2026-01-01', timeSlot: null, location: null, devices: [], meta: null,
    status, stageHistory: [], createdAt: '', updatedAt: '', stats,
  }
}

function geoProfile(role: string, state: string): GeoProfileEntity {
  return {
    id: `g-${role}`, tenant: 't', role, type: 'fo', status: 'active', coordinates: [0, 0], coverageRadius: 10, meta: {},
    createdAt: '', updatedAt: '',
    addressLine1: null, addressLine2: null, locality: null, city: null, state, country: null, pincode: null, googlePlaceId: null,
  }
}

describe('buildFoLeaderboard', () => {
  it('includes every roster FO even with zero camps', () => {
    const roster = [fo('r1', 'Ravi', 'FO-1'), fo('r2', 'Anita', 'FO-2')]
    const rows = buildFoLeaderboard(roster, [camp('r1', 'closed', { patients: 5, patientsCompleted: 5 })])

    expect(rows.length).toBe(2)
    const anita = rows.find((r) => r.roleId === 'r2')
    expect(anita?.camps).toBe(0)
    expect(anita?.closed).toBe(0)
    expect(anita?.patients).toBe(0)
  })

  it('counts closed + cancelled_charged as closed, and sums patient stats across all camps', () => {
    const roster = [fo('r1', 'Ravi', 'FO-1')]
    const rows = buildFoLeaderboard(roster, [
      camp('r1', 'closed', { patients: 10, patientsCompleted: 8 }),
      camp('r1', 'cancelled_charged', { patients: 2, patientsCompleted: 2 }),
      camp('r1', 'live', { patients: 3, patientsCompleted: 0 }),
    ])

    expect(rows[0].camps).toBe(3)
    expect(rows[0].closed).toBe(2)
    expect(rows[0].patients).toBe(15)
    expect(rows[0].patientsCompleted).toBe(10)
  })

  it('sorts descending by camp count', () => {
    const roster = [fo('r1', 'A', 'A'), fo('r2', 'B', 'B')]
    const rows = buildFoLeaderboard(roster, [camp('r1', 'closed'), camp('r2', 'closed'), camp('r2', 'closed')])
    expect(rows[0].roleId).toBe('r2')
    expect(rows[1].roleId).toBe('r1')
  })

  it('ignores camps with no fo assigned (diet camps staffed by a dietitian)', () => {
    const roster = [fo('r1', 'A', 'A')]
    const rows = buildFoLeaderboard(roster, [camp(null, 'closed'), camp('r1', 'closed')])
    expect(rows[0].camps).toBe(1)
  })
})

describe('buildFoRegionSpread', () => {
  it('groups by zonal region derived from the FO geoProfile state', () => {
    const geoProfiles = [geoProfile('r1', 'Maharashtra'), geoProfile('r2', 'Tamil Nadu')]
    const camps = [camp('r1', 'closed'), camp('r1', 'closed'), camp('r2', 'closed')]
    const rows = buildFoRegionSpread(geoProfiles, camps)

    const west = rows.find((r) => r.region === 'West')
    const south = rows.find((r) => r.region === 'South')
    expect(west?.camps).toBe(2)
    expect(west?.fos).toBe(1)
    expect(south?.camps).toBe(1)
  })

  it('excludes an FO with no geoProfile rather than bucketing as a fake "Other"', () => {
    const geoProfiles = [geoProfile('r1', 'Maharashtra')]
    const camps = [camp('r1', 'closed'), camp('r2', 'closed')] // r2 has no geoProfile
    const rows = buildFoRegionSpread(geoProfiles, camps)

    const totalCamps = rows.reduce((sum, r) => sum + r.camps, 0)
    expect(totalCamps).toBe(1)
  })

  it('sorts descending by camp count', () => {
    const geoProfiles = [geoProfile('r1', 'Maharashtra'), geoProfile('r2', 'Tamil Nadu')]
    const camps = [camp('r2', 'closed'), camp('r2', 'closed'), camp('r1', 'closed')]
    const rows = buildFoRegionSpread(geoProfiles, camps)
    expect(rows[0].region).toBe('South')
  })
})
