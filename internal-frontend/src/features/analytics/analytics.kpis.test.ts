import { describe, it, expect } from 'vitest'
import { computeAnalyticsKpis } from './analytics.kpis'
import type { Camp } from '@/types/camp.types'

const formatINR = (v: number) => `₹${v}`

function mockCampWithFo(foId: string): Camp {
  return {
    id: `c-${foId}`, date: '2026-01-01', slot: 'morning', type: 'Screening', status: 'CLOSED',
    clientId: 'client-1', doctorId: 'doc-1', city: 'Mumbai', state: 'Maharashtra',
    foId, patientsExpected: 10, patientsDone: 8, devicesAllocated: [], rxCount: 2, feedback: 4, foRating: 4,
  }
}

describe('computeAnalyticsKpis — Active FOs tile', () => {
  it('renders the real activeFOs count when present, never a fabricated/mock value', () => {
    const tiles = computeAnalyticsKpis([], [], [], [], 7, formatINR)
    const tile = tiles.find((t) => t.id === 'active-fos')
    expect(tile?.value).toBe('7')
  })

  it('renders "—" when activeFOs is null (unavailable/unpermitted), not 0 or a mock count', () => {
    const tiles = computeAnalyticsKpis([], [], [], [], null, formatINR)
    const tile = tiles.find((t) => t.id === 'active-fos')
    expect(tile?.value).toBe('—')
  })

  it('never derives "assigned camps" from the legacy mock camp store, even when it has foId-assigned camps', () => {
    const mockCampsWithFo = [mockCampWithFo('fo-1'), mockCampWithFo('fo-2'), mockCampWithFo('fo-3')]
    const tiles = computeAnalyticsKpis(mockCampsWithFo, [], [], [], 7, formatINR)
    const tile = tiles.find((t) => t.id === 'active-fos')

    expect(tile?.sub).not.toMatch(/\d+\s*assigned camps/)
    expect(tile?.sub).toBe('assigned camps — not available')
  })
})
