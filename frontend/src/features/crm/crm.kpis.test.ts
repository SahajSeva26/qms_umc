import { describe, it, expect } from 'vitest'
import { computeKpis } from './crm.kpis'
import type { LeadReportResponse } from '@/types/crm.types'

function makeReport(summary: Partial<LeadReportResponse['summary']>): LeadReportResponse {
  return {
    summary: { totalLeads: 0, converted: 0, lost: 0, open: 0, ...summary },
    byStatus: [],
    byProjectType: [],
    trends: { newLeads: { from: '2026-08-01', to: '2026-09-01', data: [] } },
  }
}

describe('computeKpis', () => {
  it('maps summary fields to the 4 surviving tiles with correct labels', () => {
    const tiles = computeKpis(makeReport({ totalLeads: 120, converted: 40, lost: 15, open: 65 }))

    expect(tiles.map((t) => t.id)).toEqual(['open', 'won', 'lost', 'wr'])
    expect(tiles.find((t) => t.id === 'open')).toMatchObject({ label: 'Open Opportunities', value: 65 })
    expect(tiles.find((t) => t.id === 'won')).toMatchObject({ label: 'Won leads', value: 40 })
    expect(tiles.find((t) => t.id === 'lost')).toMatchObject({ label: 'Lost leads', value: 15 })
  })

  it('computes win rate as converted / (converted + lost) as a percentage', () => {
    const tiles = computeKpis(makeReport({ converted: 40, lost: 10 }))
    expect(tiles.find((t) => t.id === 'wr')).toMatchObject({ value: 80 })
  })

  it('win rate is 0 when there are no won or lost leads yet', () => {
    const tiles = computeKpis(makeReport({ converted: 0, lost: 0 }))
    expect(tiles.find((t) => t.id === 'wr')).toMatchObject({ value: 0 })
  })

  it('returns zeroed tiles (not a crash) when report is undefined', () => {
    const tiles = computeKpis(undefined)
    expect(tiles.every((t) => t.value === 0)).toBe(true)
  })

  it('returns zeroed tiles when report is null', () => {
    const tiles = computeKpis(null)
    expect(tiles.every((t) => t.value === 0)).toBe(true)
  })
})
