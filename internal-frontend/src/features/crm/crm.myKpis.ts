import type { KpiTile, LeadEntity } from '@/types/crm.types'

// Derived client-side from a full own-scoped /leads sweep — unlike crm.kpis.ts's computeKpis,
// this has no /leads/report to read from (that endpoint is lead:manage-gated, see lead.routes.ts).
// All 8 fields below are plainly present on LeadEntity (incl. stageHistory, used for velocity).
// Top rep / targets / quota / team metrics have no own-scope contract and stay omitted.
const MY_KPI_CONFIG: Omit<KpiTile, 'value' | 'delta'>[] = [
  { id: 'total', label: 'My Leads', tone: 'brand', icon: 'Briefcase', fmt: 'num' },
  { id: 'won', label: 'Won', tone: 'emerald', icon: 'CheckCircle', fmt: 'num' },
  { id: 'lost', label: 'Lost', tone: 'rose', icon: 'XCircle', fmt: 'num' },
  { id: 'open', label: 'Open Pipeline', tone: 'violet', icon: 'Target', fmt: 'num' },
  { id: 'openValue', label: 'Open Pipeline Value', tone: 'violet', icon: 'DollarSign', fmt: 'inr' },
  { id: 'wr', label: 'Win Rate', tone: 'teal', icon: 'Target', fmt: 'pct' },
  { id: 'avgWon', label: 'Avg Won Deal Size', tone: 'teal', icon: 'DollarSign', fmt: 'inr' },
  { id: 'velocity', label: 'Sales Velocity (days)', tone: 'amber', icon: 'Clock', fmt: 'num' },
]

// Mirrors the backend's own all-time calc (lead.service.ts report()'s `salesVelocity` facet):
// for each won lead, days from creation to its FIRST won stageHistory entry, averaged.
function avgVelocityDays(won: LeadEntity[]): number {
  const days = won
    .map((lead) => {
      const wonEntry = lead.stageHistory.find((h) => h.to === 'won')
      if (!wonEntry) return null
      return (new Date(wonEntry.createdAt).getTime() - new Date(lead.createdAt).getTime()) / 86_400_000
    })
    .filter((d): d is number => d !== null)

  if (days.length === 0) return 0
  return days.reduce((sum, d) => sum + d, 0) / days.length
}

export function computeMyKpis(leads: LeadEntity[]): KpiTile[] {
  const won = leads.filter((l) => l.status === 'won')
  const lost = leads.filter((l) => l.status === 'lost')
  const open = leads.filter((l) => l.status !== 'won' && l.status !== 'lost')

  const openValue = open.reduce((sum, l) => sum + l.estimatedValue, 0)
  const wonValue = won.reduce((sum, l) => sum + l.estimatedValue, 0)
  const winRate = won.length + lost.length > 0 ? (won.length / (won.length + lost.length)) * 100 : 0
  const avgWon = won.length > 0 ? wonValue / won.length : 0

  const values: Record<string, number> = {
    total: leads.length,
    won: won.length,
    lost: lost.length,
    open: open.length,
    openValue,
    wr: Math.round(winRate * 10) / 10,
    avgWon,
    velocity: Math.round(avgVelocityDays(won) * 10) / 10,
  }

  return MY_KPI_CONFIG.map((cfg) => ({ ...cfg, value: values[cfg.id], delta: 0 }))
}
