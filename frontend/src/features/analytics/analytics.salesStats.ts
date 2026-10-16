import type { LeadEntity } from '@/types/crm.types'

export interface TopAccountRow {
  tenant: string
  leads: number
  value: number
}

function tenantName(lead: LeadEntity): string {
  return typeof lead.tenant === 'string' ? lead.tenant : lead.tenant.name
}

// Top 10 pharma clients by Σ estimatedValue over the swept (period-bound) lead set — real data,
// not the prototype's in-memory mock array.
export function buildTopAccounts(leads: LeadEntity[]): TopAccountRow[] {
  const byTenant = new Map<string, { leads: number; value: number }>()
  for (const lead of leads) {
    const key = tenantName(lead)
    const entry = byTenant.get(key) ?? { leads: 0, value: 0 }
    entry.leads++
    entry.value += lead.estimatedValue
    byTenant.set(key, entry)
  }

  return Array.from(byTenant.entries())
    .map(([tenant, entry]) => ({ tenant, ...entry }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)
}
