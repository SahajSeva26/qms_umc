import type { Lead } from '@/types/lead.types'
import type { KpiTile } from '@/types/lead.types'
import { KPI_CONFIG } from '@/features/crm/crm.mock'

// Mirrors the prototype's live-computed KPI strip (scopedKpis() in crm.js) —
// pipe/open/won/wr/aov/aiscore are recomputed from the actual lead set;
// vel (sales velocity) and top (top rep) don't have a real data source to
// derive from yet, so they stay as clearly-labeled placeholders.
export function computeKpis(leads: Lead[], isKam: boolean): KpiTile[] {
  const active = leads.filter((l) => l.stage !== 'won' && l.stage !== 'lost')
  const won = leads.filter((l) => l.stage === 'won')
  const lost = leads.filter((l) => l.stage === 'lost')

  const pipe = active.reduce((sum, l) => sum + l.value, 0)
  const wonValue = won.reduce((sum, l) => sum + l.value, 0)
  const winRate = won.length + lost.length > 0 ? (won.length / (won.length + lost.length)) * 100 : 0
  const aov = active.length > 0 ? pipe / active.length : 0
  const aiScore = leads.length > 0 ? leads.reduce((sum, l) => sum + l.score, 0) / leads.length : 0

  const values: Record<string, number | string> = {
    pipe,
    open: active.length,
    won: wonValue,
    wr: Math.round(winRate * 10) / 10,
    aov: Math.round(aov),
    vel: 41,
    aiscore: Math.round(aiScore),
    top: OWNERS_TOP_LABEL(leads),
  }

  const deltas: Record<string, number> = { pipe: 6.4, open: 3.1, won: 24.0, wr: 2.1, aov: 5.7, vel: -3.2, aiscore: 1.4, top: 12.0 }

  const tiles = KPI_CONFIG.map((cfg) => ({
    ...cfg,
    value: values[cfg.id],
    delta: deltas[cfg.id] ?? 0,
    sub: cfg.id === 'top' ? topRepSub(leads) : undefined,
  }))

  // KAM (sales_rep) sessions see only 5 tiles, matching the prototype
  return isKam ? tiles.filter((t) => !['vel', 'aiscore', 'top'].includes(t.id)) : tiles
}

function OWNERS_TOP_LABEL(leads: Lead[]): string {
  const wonByOwner = new Map<string, number>()
  leads.filter((l) => l.stage === 'won').forEach((l) => {
    wonByOwner.set(l.owner, (wonByOwner.get(l.owner) ?? 0) + l.value)
  })
  const top = [...wonByOwner.entries()].sort((a, b) => b[1] - a[1])[0]
  return top ? top[0].split(' ')[0] + ' ' + top[0].split(' ')[1]?.[0] + '.' : '—'
}

function topRepSub(leads: Lead[]): string {
  const wonByOwner = new Map<string, number>()
  leads.filter((l) => l.stage === 'won').forEach((l) => {
    wonByOwner.set(l.owner, (wonByOwner.get(l.owner) ?? 0) + l.value)
  })
  const top = [...wonByOwner.entries()].sort((a, b) => b[1] - a[1])[0]
  if (!top) return ''
  return `${(top[1] / 100000).toFixed(1)} L closed`
}
