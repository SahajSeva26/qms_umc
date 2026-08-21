import type { LeadEntity, KpiTile } from '@/types/crm.types'

// 'vel' (sales velocity) and 'top' (top rep) are omitted — no backend field exists to source them.
const KPI_CONFIG: Omit<KpiTile, 'value' | 'delta'>[] = [
  { id: 'pipe', label: 'Pipeline Value', tone: 'brand', icon: 'TrendingUp', fmt: 'inr' },
  { id: 'open', label: 'Open Opportunities', tone: 'violet', icon: 'Briefcase', fmt: 'num' },
  { id: 'won', label: 'Won', tone: 'emerald', icon: 'CheckCircle', fmt: 'inr' },
  { id: 'wr', label: 'Win Rate', tone: 'teal', icon: 'Target', fmt: 'pct' },
  { id: 'aov', label: 'Avg Deal Size', tone: 'amber', icon: 'DollarSign', fmt: 'inr' },
]

export function computeKpis(leads: LeadEntity[]): KpiTile[] {
  const active = leads.filter((l) => l.status !== 'won' && l.status !== 'lost')
  const won = leads.filter((l) => l.status === 'won')
  const lost = leads.filter((l) => l.status === 'lost')

  const pipe = active.reduce((sum, l) => sum + l.estimatedValue, 0)
  const wonValue = won.reduce((sum, l) => sum + l.estimatedValue, 0)
  const winRate = won.length + lost.length > 0 ? (won.length / (won.length + lost.length)) * 100 : 0
  const aov = active.length > 0 ? pipe / active.length : 0

  const values: Record<string, number | string> = {
    pipe,
    open: active.length,
    won: wonValue,
    wr: Math.round(winRate * 10) / 10,
    aov: Math.round(aov),
  }

  const deltas: Record<string, number> = { pipe: 0, open: 0, won: 0, wr: 0, aov: 0 }

  return KPI_CONFIG.map((cfg) => ({
    ...cfg,
    value: values[cfg.id],
    delta: deltas[cfg.id] ?? 0,
  }))
}
