import { describe, it, expect } from 'vitest'
import { buildTopAccounts } from './analytics.salesStats'
import type { LeadEntity } from '@/types/crm.types'

function lead(tenant: string | { name: string }, estimatedValue: number): LeadEntity {
  return {
    id: `l-${Math.random()}`, code: 'l', tenant: typeof tenant === 'string' ? tenant : { name: tenant.name, code: 'c' },
    division: 'd', contactPerson: 'c', salesPerson: 's', focusTherapy: [], focusTherapyDoctor: [],
    title: 't', problemStatement: '', numberOfMRS: 0, currentlyDoing: [], projectType: 'screening',
    offers: [], estimatedValue, confidence: 0, status: 'new', stageHistory: [], createdAt: '', updatedAt: '',
  }
}

describe('buildTopAccounts', () => {
  it('groups by tenant name and sums estimatedValue', () => {
    const leads = [
      lead({ name: 'Mankind' }, 2_00_00_000),
      lead({ name: 'Mankind' }, 1_00_00_000),
      lead({ name: 'GSK' }, 4_10_00_000),
    ]
    const rows = buildTopAccounts(leads)

    const mankind = rows.find((r) => r.tenant === 'Mankind')
    expect(mankind?.value).toBe(3_00_00_000)
    expect(mankind?.leads).toBe(2)
    const gsk = rows.find((r) => r.tenant === 'GSK')
    expect(gsk?.value).toBe(4_10_00_000)
    expect(gsk?.leads).toBe(1)
  })

  it('sorts descending by value and caps at 10', () => {
    const leads = Array.from({ length: 15 }, (_, i) => lead({ name: `Client ${i}` }, i * 1000))
    const rows = buildTopAccounts(leads)

    expect(rows.length).toBe(10)
    expect(rows[0].tenant).toBe('Client 14')
    expect(rows[9].tenant).toBe('Client 5')
  })

  it('falls back to the raw id string when tenant is an unpopulated id', () => {
    const rows = buildTopAccounts([lead('raw-tenant-id', 5000)])
    expect(rows[0].tenant).toBe('raw-tenant-id')
  })

  it('returns an empty array for an empty lead set', () => {
    expect(buildTopAccounts([])).toEqual([])
  })
})
