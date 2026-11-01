import { describe, it, expect } from 'vitest'
import { buildLeaderboard } from './salesDashboard.performance'
import type { LeadEntity } from '@/types/crm.types'
import type { AppointmentEntity } from '@/types/appointment.types'

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

function appointmentFixture(overrides: Partial<AppointmentEntity>): AppointmentEntity {
  return {
    id: 'a1', code: 'apt-000001', tenant: 't1', division: 'd1', type: 'new',
    salesPerson: { _id: 'rep-1', code: 'rep-1', name: 'Rep One', permissions: [], status: 'active', type: 'sales-rep', user: 'u1', tenant: 't1' },
    contactPerson: 'c1', internalMembers: [], mode: 'call', agenda: { public: '' },
    duration: { startTime: '2026-01-05T10:00:00.000Z' },
    status: 'planned', stageHistory: [],
    ...overrides,
  } as unknown as AppointmentEntity
}

describe('buildLeaderboard', () => {
  it('groups leads by real salesPerson identity, computing won/lost/winRate/wonValue/newLeads per rep', () => {
    const rows = buildLeaderboard([
      leadFixture({ id: 'l1', status: 'won', estimatedValue: 100_000 }),
      leadFixture({ id: 'l2', status: 'lost' }),
      leadFixture({
        id: 'l3', status: 'won', estimatedValue: 50_000,
        salesPerson: { _id: 'rep-2', code: 'rep-2', name: 'Rep Two', permissions: [], status: 'active', type: 'sales-rep', user: 'u2', tenant: 't1' },
      }),
    ], [])

    expect(rows).toHaveLength(2)
    const repOne = rows.find((r) => r.repId === 'rep-1')!
    expect(repOne.newLeads).toBe(2)
    expect(repOne.won).toBe(1)
    expect(repOne.lost).toBe(1)
    expect(repOne.winRate).toBe(50)
    expect(repOne.wonValue).toBe(100_000)
  })

  it('counts real appointments into Meetings/Follow-ups, merged into the same rep row as their leads', () => {
    const rows = buildLeaderboard(
      [leadFixture({ id: 'l1', status: 'won', estimatedValue: 10_000 })],
      [
        appointmentFixture({ id: 'a1', type: 'new' }),
        appointmentFixture({ id: 'a2', type: 'follow-up' }),
        appointmentFixture({ id: 'a3', type: 'follow-up' }),
      ],
    )

    expect(rows).toHaveLength(1)
    expect(rows[0].meetings).toBe(3)
    expect(rows[0].followUps).toBe(2)
    expect(rows[0].newLeads).toBe(1)
  })

  it('creates a rep row from appointments alone, even with zero leads', () => {
    const rows = buildLeaderboard([], [appointmentFixture({})])
    expect(rows).toHaveLength(1)
    expect(rows[0].meetings).toBe(1)
    expect(rows[0].newLeads).toBe(0)
  })

  it('sorts by won value descending', () => {
    const rows = buildLeaderboard([
      leadFixture({
        id: 'l1', status: 'won', estimatedValue: 10_000,
        salesPerson: { _id: 'rep-low', code: 'rep-low', name: 'Low', permissions: [], status: 'active', type: 'sales-rep', user: 'u1', tenant: 't1' },
      }),
      leadFixture({
        id: 'l2', status: 'won', estimatedValue: 90_000,
        salesPerson: { _id: 'rep-high', code: 'rep-high', name: 'High', permissions: [], status: 'active', type: 'sales-rep', user: 'u2', tenant: 't1' },
      }),
    ], [])

    expect(rows.map((r) => r.repId)).toEqual(['rep-high', 'rep-low'])
  })

  it('skips leads/appointments whose salesPerson is an unpopulated id string, rather than crashing', () => {
    const rows = buildLeaderboard(
      [leadFixture({ id: 'l1', salesPerson: 'raw-id-string' })],
      [appointmentFixture({ id: 'a1', salesPerson: 'raw-id-string' })],
    )
    expect(rows).toHaveLength(0)
  })

  it('excludes the seeded "system" bootstrap account from both leads and appointments — it is not a real sales rep', () => {
    const systemRole = { _id: 'sys-1', code: 'system', name: 'System', permissions: [], status: 'active', type: '64f0000000000000000000aa', user: 'u1', tenant: 't1' }
    const rows = buildLeaderboard(
      [leadFixture({ id: 'l1', status: 'won', estimatedValue: 10_000, salesPerson: systemRole })],
      [appointmentFixture({ id: 'a1', salesPerson: systemRole })],
    )
    expect(rows).toHaveLength(0)
  })

  it('never divides by zero when a rep has no decided (won/lost) leads yet', () => {
    const rows = buildLeaderboard([leadFixture({ id: 'l1', status: 'qualified' })], [])
    expect(rows[0].winRate).toBe(0)
  })
})
