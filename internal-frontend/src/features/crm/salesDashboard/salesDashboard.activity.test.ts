import { describe, it, expect } from 'vitest'
import { buildActivityHeatmap } from './salesDashboard.activity'
import type { AppointmentEntity } from '@/types/appointment.types'
import type { LeadEntity } from '@/types/crm.types'

// Thursday 2026-01-08 — same week as Monday 2026-01-05 / Tuesday 2026-01-06, used as the "now"
// reference point across these tests so fixtures land inside the current week being tested.
const NOW = new Date('2026-01-08T12:00:00.000Z')

function appointmentFixture(overrides: Partial<AppointmentEntity>): AppointmentEntity {
  return {
    id: 'a1', code: 'apt-000001', tenant: 't1', division: 'd1', type: 'new',
    salesPerson: { _id: 'rep-1', code: 'rep-1', name: 'Rep One', permissions: [], status: 'active', type: 'sales-rep', user: 'u1', tenant: 't1' },
    contactPerson: 'c1', internalMembers: [], mode: 'call', agenda: { public: '' },
    duration: { startTime: '2026-01-05T10:00:00.000Z' }, // Monday, this week
    status: 'planned', stageHistory: [],
    ...overrides,
  } as unknown as AppointmentEntity
}

function leadFixture(overrides: Partial<LeadEntity>): LeadEntity {
  return {
    id: 'l1', code: 'ld-000001', tenant: 't1', division: 'd1', contactPerson: 'c1',
    salesPerson: { _id: 'rep-1', code: 'rep-1', name: 'Rep One', permissions: [], status: 'active', type: 'sales-rep', user: 'u1', tenant: 't1' },
    focusTherapy: [], focusTherapyDoctor: [], title: 'Lead', problemStatement: '', numberOfMRS: 1,
    currentlyDoing: [], projectType: 'screening', offers: [], estimatedValue: 0, confidence: 50,
    status: 'new', stageHistory: [], createdAt: '2026-01-01', updatedAt: '2026-01-01',
    ...overrides,
  } as LeadEntity
}

describe('buildActivityHeatmap', () => {
  it('counts a real appointment into its rep + weekday cell (Monday → column 0)', () => {
    const rows = buildActivityHeatmap([appointmentFixture({})], [], NOW)
    expect(rows).toHaveLength(1)
    expect(rows[0].repName).toBe('Rep One')
    expect(rows[0].counts).toEqual([1, 0, 0, 0, 0, 0])
    expect(rows[0].total).toBe(1)
  })

  it('counts a real lead stage-history entry into its rep + weekday cell', () => {
    const rows = buildActivityHeatmap([], [
      leadFixture({ stageHistory: [{ from: 'new', to: 'qualified', reason: 'x', actor: {}, createdAt: '2026-01-06T00:00:00.000Z' }] }), // Tuesday, this week
    ], NOW)
    expect(rows[0].counts).toEqual([0, 1, 0, 0, 0, 0])
  })

  it('combines appointments and lead moves for the same rep into one row', () => {
    const rows = buildActivityHeatmap(
      [appointmentFixture({})], // Monday, this week
      [leadFixture({ stageHistory: [{ from: 'new', to: 'qualified', reason: 'x', actor: {}, createdAt: '2026-01-05T12:00:00.000Z' }] })], // also Monday, this week
      NOW,
    )
    expect(rows).toHaveLength(1)
    expect(rows[0].counts[0]).toBe(2)
    expect(rows[0].total).toBe(2)
  })

  it('excludes Sunday entirely (6-day week, matching the prototype layout) — a Sunday-only rep has no row at all', () => {
    const rows = buildActivityHeatmap([appointmentFixture({ duration: { startTime: '2026-01-04T10:00:00.000Z' } })], [], NOW) // Sunday, this week
    expect(rows).toHaveLength(0)
  })

  it('excludes activity from a PRIOR week — this is the real bug fix: the heatmap used to bucket by weekday across all history, with no date-range filter at all', () => {
    const rows = buildActivityHeatmap([appointmentFixture({ duration: { startTime: '2025-12-29T10:00:00.000Z' } })], [], NOW) // Monday, but the WEEK BEFORE
    expect(rows).toHaveLength(0)
  })

  it('excludes activity from the NEXT week', () => {
    const rows = buildActivityHeatmap([appointmentFixture({ duration: { startTime: '2026-01-11T10:00:00.000Z' } })], [], NOW) // Sunday of next week
    expect(rows).toHaveLength(0)
  })

  it('skips an unpopulated (raw id string) salesPerson rather than crashing', () => {
    const rows = buildActivityHeatmap([appointmentFixture({ salesPerson: 'raw-id' })], [], NOW)
    expect(rows).toHaveLength(0)
  })

  it('excludes the seeded "system" bootstrap account from the heatmap — it is not a real sales rep', () => {
    const rows = buildActivityHeatmap(
      [appointmentFixture({ salesPerson: { _id: 'sys-1', code: 'system', name: 'System', permissions: [], status: 'active', type: '64f0000000000000000000aa', user: 'u1', tenant: 't1' } })],
      [leadFixture({ salesPerson: { _id: 'sys-1', code: 'system', name: 'System', permissions: [], status: 'active', type: '64f0000000000000000000aa', user: 'u1', tenant: 't1' }, stageHistory: [{ from: 'new', to: 'qualified', reason: 'x', actor: {}, createdAt: '2026-01-05T00:00:00.000Z' }] })],
      NOW,
    )
    expect(rows).toHaveLength(0)
  })

  it('sorts rows by total descending', () => {
    const rows = buildActivityHeatmap(
      [
        appointmentFixture({ id: 'a1', salesPerson: { _id: 'low', code: 'low', name: 'Low', permissions: [], status: 'active', type: 'sales-rep', user: 'u1', tenant: 't1' } }),
        appointmentFixture({ id: 'a2', salesPerson: { _id: 'high', code: 'high', name: 'High', permissions: [], status: 'active', type: 'sales-rep', user: 'u2', tenant: 't1' } }),
        appointmentFixture({ id: 'a3', salesPerson: { _id: 'high', code: 'high', name: 'High', permissions: [], status: 'active', type: 'sales-rep', user: 'u2', tenant: 't1' }, duration: { startTime: '2026-01-06T10:00:00.000Z' } }),
      ],
      [],
      NOW,
    )
    expect(rows.map((r) => r.repId)).toEqual(['high', 'low'])
  })
})
