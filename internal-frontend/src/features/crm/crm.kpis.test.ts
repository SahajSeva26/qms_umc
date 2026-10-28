import { describe, it, expect } from 'vitest'
import { computeKpis, computeValueKpis } from './crm.kpis'
import type { LeadReportResponse } from '@/types/crm.types'

function makeReport(
  summary: Partial<LeadReportResponse['summary']>,
  kpis: Partial<LeadReportResponse['kpis']> = {},
): LeadReportResponse {
  return {
    summary: { totalLeads: 0, converted: 0, lost: 0, open: 0, ...summary },
    byStatus: [],
    byProjectType: [],
    trends: { newLeads: { from: '2026-08-01', to: '2026-09-01', data: [] } },
    kpis: { pipelineValue: 0, wonValue: 0, wonCount: 0, avgDealSize: 0, winRate: 0, salesVelocityDays: 0, topRep: null, ...kpis },
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

describe('computeValueKpis', () => {
  it('does not add a Top Rep tile when report.kpis.topRep is null', () => {
    const tiles = computeValueKpis(makeReport({}, { topRep: null }))
    expect(tiles.find((t) => t.id === 'topRep')).toBeUndefined()
    expect(tiles.map((t) => t.id)).toEqual(['pipelineValue', 'wonValue', 'avgDealSize', 'salesVelocityDays'])
  })

  it('adds a Top Rep tile reusing report.kpis.topRep — no extra fetch, picked up from the already-loaded report', () => {
    const tiles = computeValueKpis(
      makeReport({}, { topRep: { salesPerson: 'r-1', name: 'Rohit Malhotra', wonValue: 2500000, wonCount: 7 } }),
    )

    const topRepTile = tiles.find((t) => t.id === 'topRep')
    expect(topRepTile).toMatchObject({ label: 'Top Rep', fmt: 'raw', value: 'Rohit Malhotra' })
    expect(topRepTile?.sub).toContain('7 won')
  })

  it('returns no Top Rep tile (not a crash) when report is undefined', () => {
    const tiles = computeValueKpis(undefined)
    expect(tiles.find((t) => t.id === 'topRep')).toBeUndefined()
  })
})
