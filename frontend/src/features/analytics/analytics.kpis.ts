import type { Camp } from '@/types/camp.types'
import type { ClientInvoice, ClientProject } from '@/types/client.types'
import type { LeadEntity } from '@/types/crm.types'
import type { FieldOfficer } from '@/types/analytics.types'
import { pct } from '@/features/analytics/analytics.utils'

export interface AnalyticsKpiTile {
  id: string
  label: string
  icon: string
  tone: string
  value: string
  sub: string
}

// The 8-tile top strip, recomputed from the already-scoped datasets every
// time filters change — mirrors the prototype's renderKpis() exactly.
export function computeAnalyticsKpis(
  camps: Camp[],
  projects: ClientProject[],
  leads: LeadEntity[],
  invoices: ClientInvoice[],
  fieldOfficers: FieldOfficer[],
  formatINR: (v: number) => string
): AnalyticsKpiTile[] {
  const won = leads.filter((l) => l.status === 'won')
  const liveProjects = projects.filter((p) => p.status === 'LIVE')
  const closed = camps.filter((c) => c.status === 'CLOSED')
  const patients = closed.reduce((sum, c) => sum + (c.patientsDone || 0), 0)
  const rx = closed.reduce((sum, c) => sum + (c.rxCount || 0), 0)
  const rated = closed.filter((c) => c.feedback > 0)
  const avgRating = rated.length > 0 ? Math.round((rated.reduce((sum, c) => sum + c.feedback, 0) / rated.length) * 10) / 10 : null
  const paidInvoices = invoices.filter((i) => i.status === 'PAID')
  const revenue = paidInvoices.reduce((sum, i) => sum + i.amount, 0)
  const overdueInvoices = invoices.filter((i) => i.status === 'OVERDUE')
  const arOpen = invoices.filter((i) => i.status !== 'PAID').reduce((sum, i) => sum + i.amount, 0)
  const activeFOs = fieldOfficers.filter((f) => !f.relievedOn)
  const assignedCamps = camps.filter((c) => !!c.foId)

  return [
    { id: 'pipeline', label: 'Pipeline', icon: 'Briefcase', tone: 'brand', value: String(leads.length), sub: `${won.length} won · ${pct(won.length, leads.length)}% win` },
    { id: 'live-projects', label: 'Live projects', icon: 'FolderOpen', tone: 'teal', value: String(liveProjects.length), sub: `${projects.length} total` },
    { id: 'camps-closed', label: 'Camps · closed', icon: 'Tent', tone: 'emerald', value: String(closed.length), sub: `${camps.length} total in period` },
    { id: 'patients', label: 'Patients', icon: 'Users', tone: 'violet', value: patients.toLocaleString('en-IN'), sub: `${rx} Rx` },
    { id: 'avg-rating', label: 'Avg rating', icon: 'Star', tone: 'amber', value: avgRating !== null ? `${avgRating} ★` : '—', sub: `${rated.length} rated` },
    { id: 'revenue', label: 'Revenue (paid)', icon: 'Receipt', tone: 'brand', value: formatINR(revenue), sub: `${paidInvoices.length} invoices` },
    { id: 'ar-open', label: 'AR open', icon: 'AlertTriangle', tone: 'rose', value: formatINR(arOpen), sub: `${overdueInvoices.length} overdue` },
    { id: 'active-fos', label: 'Active FOs', icon: 'Route', tone: 'brand', value: String(activeFOs.length), sub: `${assignedCamps.length} assigned camps` },
  ]
}
