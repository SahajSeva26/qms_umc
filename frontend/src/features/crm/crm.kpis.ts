import type { KpiTile, LeadReportResponse } from '@/types/crm.types'

// Pipeline Value / Won ₹ / Avg Deal Size are omitted — GET /leads/report has
// no estimatedValue aggregation, so those figures have no correct backend source.
const KPI_CONFIG: Omit<KpiTile, 'value' | 'delta'>[] = [
  { id: 'open', label: 'Open Opportunities', tone: 'violet', icon: 'Briefcase', fmt: 'num' },
  { id: 'won', label: 'Won leads', tone: 'emerald', icon: 'CheckCircle', fmt: 'num' },
  { id: 'lost', label: 'Lost leads', tone: 'rose', icon: 'XCircle', fmt: 'num' },
  { id: 'wr', label: 'Win Rate', tone: 'teal', icon: 'Target', fmt: 'pct' },
]

export function computeKpis(report: LeadReportResponse | null | undefined): KpiTile[] {
  const { open = 0, converted = 0, lost = 0 } = report?.summary ?? {}
  const winRate = converted + lost > 0 ? (converted / (converted + lost)) * 100 : 0

  const values: Record<string, number> = {
    open,
    won: converted,
    lost,
    wr: Math.round(winRate * 10) / 10,
  }

  return KPI_CONFIG.map((cfg) => ({ ...cfg, value: values[cfg.id], delta: 0 }))
}
