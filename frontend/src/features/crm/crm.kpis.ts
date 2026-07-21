import type { LeadEntity, KpiTile } from '@/types/crm.types'

// Static tile metadata (label/tone/icon/fmt) — values are recomputed live
// below from the real lead set. `vel` (sales velocity) and `top` (top rep)
// from the old mock KPI strip had no real data source even before this
// migration (see crm.mock.ts's own comment) and now additionally have no
// clean backend equivalent (no score/velocity field, and identifying "top
// rep" would need a Role->User name lookup this page doesn't have) — dropped
// rather than faked.
const KPI_CONFIG: Omit<KpiTile, 'value' | 'delta'>[] = [
  { id: 'pipe', label: 'Pipeline Value', tone: 'brand', icon: 'TrendingUp', fmt: 'inr' },
  { id: 'open', label: 'Open Opportunities', tone: 'violet', icon: 'Briefcase', fmt: 'num' },
  { id: 'won', label: 'Won', tone: 'emerald', icon: 'CheckCircle', fmt: 'inr' },
  { id: 'wr', label: 'Win Rate', tone: 'teal', icon: 'Target', fmt: 'pct' },
  { id: 'aov', label: 'Avg Deal Size', tone: 'amber', icon: 'DollarSign', fmt: 'inr' },
]

// Mirrors the prototype's live-computed KPI strip (scopedKpis() in crm.js) —
// pipe/open/won/wr/aov are recomputed from the actual lead set.
export function computeKpis(leads: LeadEntity[], isKam: boolean): KpiTile[] {
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

  const tiles = KPI_CONFIG.map((cfg) => ({
    ...cfg,
    value: values[cfg.id],
    delta: deltas[cfg.id] ?? 0,
  }))

  // KAM (sales_rep) sessions see a shorter strip, matching the prototype's
  // reduced-tile-count-for-reps behavior.
  return isKam ? tiles.filter((t) => t.id !== 'aov') : tiles
}
