import type { Camp } from '@/types/camp.types'
import type { Client, ClientInvoice, ClientProject } from '@/types/client.types'
import type { Lead } from '@/types/lead.types'
import type { AnalyticsFilters } from '@/types/analytics.types'
import { formatINR } from '@/utils/formatters'

// Cross-module scoping logic — mirrors the prototype's analytics.js
// isInPeriod()/clientMatches()/scopedCamps() etc. Two deliberate fixes vs the
// source (confirmed via research, not ported as bugs):
//  1. Leads are period-filtered on the real `Lead.age` field, not the
//     prototype's `ageDays` (a field that never existed on the mock data,
//     so the equivalent filter silently no-op'd there).
//  2. Camps/projects join by clientId; leads join by fuzzy account-name
//     match against Client.name (leads carry no clientId); invoices join by
//     clientName (documented quirk on ClientInvoice already).

export function isInPeriod(iso: string | undefined, periodDays: AnalyticsFilters['periodDays']): boolean {
  if (!iso) return true
  if (periodDays === 'all') return true
  const elapsedDays = (Date.now() - new Date(iso).getTime()) / 86_400_000
  return elapsedDays <= periodDays
}

export function scopedCamps(camps: Camp[], filters: AnalyticsFilters): Camp[] {
  return camps.filter(
    (c) => (filters.clientId === 'ALL' || c.clientId === filters.clientId) && isInPeriod(c.date, filters.periodDays)
  )
}

export function scopedProjects(projects: ClientProject[], filters: AnalyticsFilters): ClientProject[] {
  return projects.filter(
    (p) => (filters.clientId === 'ALL' || p.clientId === filters.clientId) && isInPeriod(p.poDate, filters.periodDays)
  )
}

export function scopedLeads(leads: Lead[], clients: Client[], filters: AnalyticsFilters): Lead[] {
  const client = filters.clientId === 'ALL' ? null : clients.find((c) => c.id === filters.clientId)
  return leads.filter((l) => {
    if (client && l.account.toLowerCase() !== client.name.toLowerCase()) return false
    if (filters.periodDays === 'all') return true
    return (l.age || 0) <= filters.periodDays
  })
}

export function scopedInvoices(invoices: ClientInvoice[], clients: Client[], filters: AnalyticsFilters): ClientInvoice[] {
  const client = filters.clientId === 'ALL' ? null : clients.find((c) => c.id === filters.clientId)
  return invoices.filter(
    (i) =>
      (!client || i.clientName.toLowerCase() === client.name.toLowerCase()) && isInPeriod(i.date, filters.periodDays)
  )
}

export function pct(numerator: number, denominator: number): number {
  return denominator > 0 ? Math.round((numerator / denominator) * 1000) / 10 : 0
}

// Rule-based "insight copilot" — three conditional clauses computed from real
// scoped data, not an AI/LLM call (confirmed via research: the prototype's
// version is also pure threshold logic under a marketing name).
export function computeInsights(camps: Camp[], leads: Lead[], invoices: ClientInvoice[]): string[] {
  const parts: string[] = []
  const closed = camps.filter((c) => c.status === 'CLOSED')
  const won = leads.filter((l) => l.stage === 'won')
  const lost = leads.filter((l) => l.stage === 'lost')
  const overdue = invoices.filter((i) => i.status === 'OVERDUE')

  if (leads.length > 0) {
    parts.push(`Pipeline conversion ${pct(won.length, leads.length)}% (${won.length}/${leads.length}) · ${lost.length} lost`)
  }
  if (closed.length > 0) {
    const avgPatients = Math.round(closed.reduce((sum, c) => sum + (c.patientsDone || 0), 0) / closed.length)
    parts.push(`Avg ${avgPatients} patients/camp across ${closed.length} closed`)
  }
  if (overdue.length > 0) {
    const overdueTotal = overdue.reduce((sum, i) => sum + i.amount, 0)
    parts.push(`${overdue.length} overdue (${formatINR(overdueTotal)})`)
  }
  return parts
}
