import { describe, it, expect } from 'vitest'
import { computeMyKpis } from './crm.myKpis'
import type { LeadEntity } from '@/types/crm.types'

function leadFixture(overrides: Partial<LeadEntity>): LeadEntity {
  return {
    id: 'l1',
    code: 'ld-000001',
    tenant: 't1',
    division: 'd1',
    contactPerson: 'c1',
    salesPerson: 's1',
    focusTherapy: [],
    focusTherapyDoctor: [],
    title: 'Lead',
    problemStatement: '',
    numberOfMRS: 1,
    currentlyDoing: [],
    projectType: 'screening',
    offers: [],
    estimatedValue: 0,
    confidence: 50,
    status: 'new',
    stageHistory: [],
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    ...overrides,
  } as LeadEntity
}

function valueOf(tiles: ReturnType<typeof computeMyKpis>, id: string) {
  return tiles.find((t) => t.id === id)?.value
}

describe('computeMyKpis', () => {
  it('returns all zeroes (never undefined/NaN) for an empty portfolio', () => {
    const tiles = computeMyKpis([])

    expect(valueOf(tiles, 'total')).toBe(0)
    expect(valueOf(tiles, 'won')).toBe(0)
    expect(valueOf(tiles, 'lost')).toBe(0)
    expect(valueOf(tiles, 'open')).toBe(0)
    expect(valueOf(tiles, 'openValue')).toBe(0)
    expect(valueOf(tiles, 'wr')).toBe(0)
    expect(valueOf(tiles, 'avgWon')).toBe(0)
    expect(valueOf(tiles, 'velocity')).toBe(0)
  })

  it('counts status buckets and sums value correctly across a mixed portfolio', () => {
    const tiles = computeMyKpis([
      leadFixture({ status: 'won', estimatedValue: 100_000 }),
      leadFixture({ status: 'won', estimatedValue: 50_000 }),
      leadFixture({ status: 'lost', estimatedValue: 20_000 }),
      leadFixture({ status: 'qualified', estimatedValue: 30_000 }),
      leadFixture({ status: 'new', estimatedValue: 10_000 }),
    ])

    expect(valueOf(tiles, 'total')).toBe(5)
    expect(valueOf(tiles, 'won')).toBe(2)
    expect(valueOf(tiles, 'lost')).toBe(1)
    expect(valueOf(tiles, 'open')).toBe(2) // qualified + new — anything not won/lost
    expect(valueOf(tiles, 'openValue')).toBe(40_000) // 30k + 10k
    expect(valueOf(tiles, 'wr')).toBeCloseTo((2 / 3) * 100, 1) // won / (won + lost)
    expect(valueOf(tiles, 'avgWon')).toBe(75_000) // (100k + 50k) / 2
  })

  it('does not divide by zero when there are no won/lost leads yet (win rate stays 0, not NaN)', () => {
    const tiles = computeMyKpis([leadFixture({ status: 'new' }), leadFixture({ status: 'proposal' })])

    expect(valueOf(tiles, 'wr')).toBe(0)
    expect(valueOf(tiles, 'avgWon')).toBe(0)
    expect(valueOf(tiles, 'velocity')).toBe(0)
  })

  it('computes sales velocity as the average days from lead creation to its first won stageHistory entry', () => {
    const tiles = computeMyKpis([
      leadFixture({
        status: 'won',
        createdAt: '2026-01-01T00:00:00.000Z',
        stageHistory: [{ from: 'qualified', to: 'won', reason: 'x', actor: {}, createdAt: '2026-01-11T00:00:00.000Z' }],
      }), // 10 days
      leadFixture({
        status: 'won',
        createdAt: '2026-02-01T00:00:00.000Z',
        stageHistory: [{ from: 'qualified', to: 'won', reason: 'x', actor: {}, createdAt: '2026-02-21T00:00:00.000Z' }],
      }), // 20 days
      leadFixture({ status: 'lost' }), // excluded — not won
    ])

    expect(valueOf(tiles, 'velocity')).toBe(15) // avg(10, 20)
  })

  it('exposes only the 8 confirmed own-scope tiles — no top-rep/targets/revenue fabrication', () => {
    const tiles = computeMyKpis([leadFixture({ status: 'won', estimatedValue: 1000 })])
    const ids = tiles.map((t) => t.id)

    expect(ids).toEqual(['total', 'won', 'lost', 'open', 'openValue', 'wr', 'avgWon', 'velocity'])
  })
})
