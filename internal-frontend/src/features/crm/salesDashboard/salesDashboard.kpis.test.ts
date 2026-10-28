import { describe, it, expect } from 'vitest'
import {
  buildRevenueTiles, buildPipelineTiles, buildMyRevenueTiles, buildMyPipelineTiles,
  buildProjectTiles, buildAiCopilotMessage,
} from './salesDashboard.kpis'
import type { LeadReportResponse, LeadEntity } from '@/types/crm.types'
import type { ProjectEntity } from '@/types/project.types'

function reportFixture(overrides: Partial<LeadReportResponse> = {}): LeadReportResponse {
  return {
    summary: { totalLeads: 10, converted: 4, lost: 2, open: 4 },
    byStatus: [],
    byProjectType: [],
    trends: { newLeads: { from: '2026-01-01', to: '2026-02-01', data: [] } },
    kpis: { pipelineValue: 500_000, wonValue: 300_000, wonCount: 4, avgDealSize: 75_000, winRate: 66.7, salesVelocityDays: 12, topRep: null },
    ...overrides,
  }
}

function leadFixture(overrides: Partial<LeadEntity>): LeadEntity {
  return {
    id: 'l1', code: 'ld-000001', tenant: 't1', division: 'd1', contactPerson: 'c1', salesPerson: 's1',
    focusTherapy: [], focusTherapyDoctor: [], title: 'Lead', problemStatement: '', numberOfMRS: 1,
    currentlyDoing: [], projectType: 'screening', offers: [], estimatedValue: 0, confidence: 50,
    status: 'new', stageHistory: [], createdAt: '2026-01-01', updatedAt: '2026-01-01',
    ...overrides,
  } as LeadEntity
}

function projectFixture(overrides: Partial<ProjectEntity>): ProjectEntity {
  return {
    id: 'p1', code: 'prj-000001', name: 'Project', tenant: null, division: null, therapy: 'cardiology',
    type: ['screening'], tests: [], lead: null, executionMode: null, campCost: 0, totalCamps: 0, gst: 0,
    valueBeforeGST: 0, additionalCost: 0, campTimeSlots: [], freeCancelHours: 0, cancellationAllowed: 0,
    campCostDeductionOnChargableCancel: 0, goLiveScope: null, whoCanBookCamp: [], salesRep: null,
    projectCoordinator: null, marketingContact: null, paymentTerms: 'net_30', status: 'live',
    stageHistory: [], daysToBookBefore: 0, dietChart: [], poRenewalReminder: 0, availablePointers: [],
    tats: '', sops: '', createdAt: '2026-01-01', updatedAt: '2026-01-01',
    ...overrides,
  } as ProjectEntity
}

describe('buildRevenueTiles (Sales Head)', () => {
  it('maps every /leads/report kpis field to a real tile, with no hardcoded/estimated extras', () => {
    const tiles = buildRevenueTiles(reportFixture())
    const ids = tiles.map((t) => t.id)

    expect(ids).toEqual(['pipeline', 'won-value', 'avg-deal', 'win-rate', 'velocity'])
    // Confirms the prototype's hardcoded tiles (YTD Growth/Gross Margin/EBITDA/Client Retention)
    // are not reproduced here under any id.
    expect(ids).not.toContain('ytd-growth')
    expect(ids).not.toContain('gross-margin')
    expect(ids).not.toContain('ebitda')
    expect(ids).not.toContain('retention')
  })
})

describe('buildPipelineTiles (Sales Head)', () => {
  it('computes conversion % from summary.converted/lost, never dividing by zero', () => {
    const tiles = buildPipelineTiles(reportFixture({ summary: { totalLeads: 0, converted: 0, lost: 0, open: 0 } }))
    const conversion = tiles.find((t) => t.id === 'conversion')
    expect(conversion?.value).toBe('0.0%')
  })

  it('computes conversion % as converted/(converted+lost)', () => {
    const tiles = buildPipelineTiles(reportFixture({ summary: { totalLeads: 10, converted: 4, lost: 2, open: 4 } }))
    const conversion = tiles.find((t) => t.id === 'conversion')
    expect(conversion?.value).toBe('66.7%')
  })
})

describe('buildMyRevenueTiles / buildMyPipelineTiles (KAM)', () => {
  it('derives the same real fields from an own-scoped lead list, with no fabricated extras', () => {
    const leads = [
      leadFixture({ id: 'l1', status: 'won', estimatedValue: 100_000 }),
      leadFixture({ id: 'l2', status: 'lost', estimatedValue: 20_000 }),
      leadFixture({ id: 'l3', status: 'qualified', estimatedValue: 30_000 }),
    ]

    const revenue = buildMyRevenueTiles(leads)
    expect(revenue.map((t) => t.id)).toEqual(['openValue', 'avgWon', 'wr', 'velocity'])

    const pipeline = buildMyPipelineTiles(leads)
    const conversion = pipeline.find((t) => t.id === 'conversion')
    expect(conversion?.value).toBe('50.0%') // 1 won / (1 won + 1 lost)
    const open = pipeline.find((t) => t.id === 'open-count')
    expect(open?.value).toBe('1')
  })
})

describe('buildProjectTiles', () => {
  it('counts total projects and per-type breakdown from a plain project list, no network call', () => {
    const tiles = buildProjectTiles([
      projectFixture({ id: 'p1', type: ['screening'] }),
      projectFixture({ id: 'p2', type: ['screening', 'diet'] }), // multi-type counts once per type
      projectFixture({ id: 'p3', type: ['lab'] }),
    ])

    expect(tiles.find((t) => t.id === 'projects-total')?.value).toBe('3')
    expect(tiles.find((t) => t.id === 'projects-screening')?.value).toBe('2')
    expect(tiles.find((t) => t.id === 'projects-diet')?.value).toBe('1')
    expect(tiles.find((t) => t.id === 'projects-lab')?.value).toBe('1')
    expect(tiles.find((t) => t.id === 'projects-teleconsultation_diet')).toBeUndefined()
  })

  it('shows a zero total rather than omitting the tile when there are no projects', () => {
    const tiles = buildProjectTiles([])
    expect(tiles.find((t) => t.id === 'projects-total')?.value).toBe('0')
    expect(tiles.length).toBe(1)
  })
})

describe('buildAiCopilotMessage', () => {
  it('builds a message from real win-rate/pipeline numbers only — no target/at-risk/coverage claims', () => {
    const message = buildAiCopilotMessage(66.7, 500_000)
    expect(message).toContain('66.7%')
    expect(message).toContain('₹5.00 L')
    expect(message).not.toMatch(/at risk|exceeded|coverage/i)
  })
})
