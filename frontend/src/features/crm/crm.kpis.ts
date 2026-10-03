import type { KpiTile, LeadReportResponse } from '@/types/crm.types'

// Pipeline Value / Won ₹ / Avg Deal Size are now backed by GET /leads/report's `kpis` block
// (2026-09-29 backend work) — no longer omitted.
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

// Value/velocity tiles — separate from computeKpis()'s status-count tiles since these come from
// report.kpis (a distinct facet block). Only wonValue/wonCount/winRate are windowed to the report's
// own from/to — pipelineValue/avgDealSize/salesVelocityDays/topRep are all computed all-time
// (see backend lead.service.ts report()).
const VALUE_KPI_CONFIG: Omit<KpiTile, 'value' | 'delta'>[] = [
  { id: 'pipelineValue', label: 'Pipeline Value', tone: 'violet', icon: 'DollarSign', fmt: 'inr' },
  { id: 'wonValue', label: 'Won Value', tone: 'emerald', icon: 'DollarSign', fmt: 'inr' },
  { id: 'avgDealSize', label: 'Avg Deal Size', tone: 'teal', icon: 'DollarSign', fmt: 'inr' },
  { id: 'salesVelocityDays', label: 'Sales Velocity (days)', tone: 'amber', icon: 'Clock', fmt: 'num' },
]

export function computeValueKpis(report: LeadReportResponse | null | undefined): KpiTile[] {
  const kpis = report?.kpis
  const values: Record<string, number> = {
    pipelineValue: kpis?.pipelineValue ?? 0,
    wonValue: kpis?.wonValue ?? 0,
    avgDealSize: kpis?.avgDealSize ?? 0,
    salesVelocityDays: kpis?.salesVelocityDays ?? 0,
  }

  return VALUE_KPI_CONFIG.map((cfg) => ({ ...cfg, value: values[cfg.id], delta: 0 }))
}
