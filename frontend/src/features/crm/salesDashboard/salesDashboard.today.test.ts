import { describe, it, expect } from 'vitest'
import { buildCompanyDivisionRows, buildProjectTypeBillingRows } from './salesDashboard.today'
import type { ProjectEntity } from '@/types/project.types'

function projectFixture(overrides: Partial<ProjectEntity>): ProjectEntity {
  return {
    id: 'p1', code: 'prj-000001', name: 'Project', tenant: { _id: 't1', name: 'Sun Pharma', code: 'sun-pharma' },
    division: { _id: 'd1', name: 'Cardio Care', code: 'cardio-care', therapy: ['cardiology'] },
    therapy: 'cardiology', type: ['screening'], tests: [], lead: null, executionMode: null,
    campCost: 10_000, totalCamps: 2, gst: 0, valueBeforeGST: 0, additionalCost: 0, campTimeSlots: [],
    freeCancelHours: 0, cancellationAllowed: 0, campCostDeductionOnChargableCancel: 0, goLiveScope: null,
    whoCanBookCamp: [], salesRep: null, projectCoordinator: null, marketingContact: null,
    paymentTerms: 'net_30', status: 'live', stageHistory: [], daysToBookBefore: 0, dietChart: [],
    poRenewalReminder: 0, availablePointers: [], tats: '', sops: '', createdAt: '2026-01-01', updatedAt: '2026-01-01',
    ...overrides,
  } as ProjectEntity
}

describe('buildCompanyDivisionRows', () => {
  it('groups projects by real tenant, computing project count and committed value (campCost × totalCamps)', () => {
    const rows = buildCompanyDivisionRows([projectFixture({ campCost: 10_000, totalCamps: 2 })])
    expect(rows).toHaveLength(1)
    expect(rows[0].tenantName).toBe('Sun Pharma')
    expect(rows[0].projectCount).toBe(1)
    expect(rows[0].committedValue).toBe(20_000)
  })

  it('derives division chips only from this rep\'s own loaded projects — not the company\'s full roster', () => {
    const rows = buildCompanyDivisionRows([
      projectFixture({ id: 'p1', division: { _id: 'd1', name: 'Cardio Care', code: 'cardio-care', therapy: ['cardiology'] } }),
      projectFixture({ id: 'p2', division: { _id: 'd1', name: 'Cardio Care', code: 'cardio-care', therapy: ['cardiology'] } }), // same division, dedup
    ])
    expect(rows[0].divisionCount).toBe(1)
    expect(rows[0].divisionNames).toEqual(['Cardio Care'])
    expect(rows[0].projectCount).toBe(2)
  })

  it('counts "PO pending" only for projects whose executionMode.mode is \'po\' with zero purchase orders', () => {
    const rows = buildCompanyDivisionRows([
      projectFixture({ id: 'p1', executionMode: { mode: 'po', po: { purchaseOrders: [] } } }),
      projectFixture({ id: 'p2', executionMode: { mode: 'po', po: { purchaseOrders: [{ number: 'PO-1' }] } } }),
      projectFixture({ id: 'p3', executionMode: { mode: 'agreement' } }), // not PO-based — excluded, not counted as 0 pending
    ])
    expect(rows[0].poPendingCount).toBe(1)
  })

  it('treats a null executionMode as not PO-pending, rather than crashing', () => {
    const rows = buildCompanyDivisionRows([projectFixture({ executionMode: null })])
    expect(rows[0].poPendingCount).toBe(0)
  })

  it('skips projects whose tenant is an unpopulated id string', () => {
    const rows = buildCompanyDivisionRows([projectFixture({ tenant: 'raw-id' })])
    expect(rows).toHaveLength(0)
  })

  it('skips a project whose division is an unpopulated id string, without crashing (just no chip for it)', () => {
    const rows = buildCompanyDivisionRows([projectFixture({ division: 'raw-id' })])
    expect(rows[0].divisionNames).toEqual([])
    expect(rows[0].divisionCount).toBe(0)
  })
})

describe('buildProjectTypeBillingRows', () => {
  it('groups by real project type, summing count and committed value; a multi-type project counts toward every type it carries', () => {
    const rows = buildProjectTypeBillingRows([
      projectFixture({ id: 'p1', type: ['screening'], campCost: 10_000, totalCamps: 2 }),
      projectFixture({ id: 'p2', type: ['screening', 'diet'], campCost: 5_000, totalCamps: 1 }),
    ])

    const screening = rows.find((r) => r.type === 'screening')!
    expect(screening.count).toBe(2)
    expect(screening.committedValue).toBe(25_000) // 20k + 5k

    const diet = rows.find((r) => r.type === 'diet')!
    expect(diet.count).toBe(1)
    expect(diet.committedValue).toBe(5_000)
  })

  it('returns an empty array for no projects', () => {
    expect(buildProjectTypeBillingRows([])).toEqual([])
  })
})
