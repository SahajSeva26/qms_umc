import type { IconType } from 'react-icons'
import { FiTrendingUp, FiTarget, FiPercent, FiAward, FiClock, FiBriefcase } from 'react-icons/fi'
import type { KpiTone } from '@/components/ui/KpiTile'
import type { LeadReportResponse, LeadEntity } from '@/types/crm.types'
import type { ProjectEntity, ProjectType } from '@/types/project.types'
import { computeMyKpis } from '@/features/crm/crm.myKpis'
import { formatINR, formatPercent } from '@/utils/formatters'

export interface DashboardTile {
  id: string
  label: string
  value: string
  tone: KpiTone
  icon: IconType
  sub?: string
}

const PROJECT_TYPE_LABEL: Record<ProjectType, string> = {
  screening: 'Screening Projects',
  diet: 'Diet Projects',
  lab: 'Lab Projects',
  teleconsultation_diet: 'Teleconsultation Diet Projects',
}

// "-" render contract: every tile this module can't back with real data is simply never returned —
// pages render it as a dash/"Not connected yet" card themselves (see SalesDashboardPage.tsx), this
// module never fabricates a 0 or an estimate in its place.

// Sales Head (lead:manage) — Revenue & Profitability + Pipeline & Forecast, from the real
// /leads/report kpis block. YTD Growth/Gross Margin/EBITDA/Client Retention are dropped outright —
// confirmed hardcoded constants in the prototype itself, not worth reproducing even as "real".
export function buildRevenueTiles(report: LeadReportResponse): DashboardTile[] {
  return [
    { id: 'pipeline', label: 'Pipeline Value', tone: 'violet', icon: FiTrendingUp, value: formatINR(report.kpis.pipelineValue) },
    { id: 'won-value', label: 'Won Value', tone: 'emerald', icon: FiAward, value: formatINR(report.kpis.wonValue) },
    { id: 'avg-deal', label: 'Avg Deal Size', tone: 'teal', icon: FiTarget, value: formatINR(report.kpis.avgDealSize) },
    { id: 'win-rate', label: 'Win Rate', tone: 'teal', icon: FiPercent, value: formatPercent(report.kpis.winRate, 1) },
    { id: 'velocity', label: 'Sales Velocity (days)', tone: 'amber', icon: FiClock, value: String(report.kpis.salesVelocityDays) },
  ]
}

export function buildPipelineTiles(report: LeadReportResponse): DashboardTile[] {
  const { converted, lost, open } = report.summary
  const decided = converted + lost
  const conversion = decided > 0 ? (converted / decided) * 100 : 0
  return [
    { id: 'conversion', label: 'Conversion to Business %', tone: 'amber', icon: FiPercent, value: formatPercent(Math.round(conversion * 10) / 10, 1) },
    { id: 'open-count', label: 'Open Opportunities', tone: 'violet', icon: FiBriefcase, value: String(open) },
  ]
}

// KAM (lead:search only) — reuses the existing own-scope sweep + computeMyKpis (CrmPage's "My Sales
// Dashboard"), same 8 tiles, re-labeled/re-toned to the Sales-Dashboard category layout.
export function buildMyRevenueTiles(leads: LeadEntity[]): DashboardTile[] {
  const kpis = computeMyKpis(leads)
  const byId = new Map(kpis.map((k) => [k.id, k]))
  const tile = (id: string, label: string, tone: KpiTone, icon: IconType): DashboardTile | null => {
    const k = byId.get(id)
    if (!k) return null
    const value = k.fmt === 'inr' ? formatINR(Number(k.value)) : k.fmt === 'pct' ? formatPercent(Number(k.value), 1) : String(k.value)
    return { id, label, tone, icon, value }
  }
  return [
    tile('openValue', 'Open Pipeline Value', 'violet', FiTrendingUp),
    tile('avgWon', 'Avg Won Deal Size', 'teal', FiTarget),
    tile('wr', 'Win Rate', 'teal', FiPercent),
    tile('velocity', 'Sales Velocity (days)', 'amber', FiClock),
  ].filter((t): t is DashboardTile => t !== null)
}

export function buildMyPipelineTiles(leads: LeadEntity[]): DashboardTile[] {
  const kpis = computeMyKpis(leads)
  const byId = new Map(kpis.map((k) => [k.id, k]))
  const won = Number(byId.get('won')?.value ?? 0)
  const lost = Number(byId.get('lost')?.value ?? 0)
  const open = Number(byId.get('open')?.value ?? 0)
  const decided = won + lost
  const conversion = decided > 0 ? (won / decided) * 100 : 0
  return [
    { id: 'conversion', label: 'Conversion to Business %', tone: 'amber', icon: FiPercent, value: formatPercent(Math.round(conversion * 10) / 10, 1) },
    { id: 'open-count', label: 'Open Opportunities', tone: 'violet', icon: FiBriefcase, value: String(open) },
  ]
}

// "Camps & Projects" category — real, derived from the shared useProjectsDataShared() list (reused,
// not a new request — see src/hooks/useProjectsDataShared.ts). project:search is own-scoped by
// Project.salesRep for a non-manage actor, project:manage sees everything, so the returned list is
// already correctly scoped per role before this function ever runs. Camps Conducted and Screenings
// are dropped — camp:search is a dead own-scope grant for this role type (matches only
// fo/mr/asm/rsm/dietitian slots, never a sales role), so there is no real per-rep camp data to show.
export function buildProjectTiles(projects: ProjectEntity[]): DashboardTile[] {
  const typeCounts = new Map<ProjectType, number>()
  for (const project of projects) {
    for (const type of project.type) {
      typeCounts.set(type, (typeCounts.get(type) ?? 0) + 1)
    }
  }

  const tiles: DashboardTile[] = [{ id: 'projects-total', label: 'No. of Projects', tone: 'brand', icon: FiBriefcase, value: String(projects.length) }]
  for (const [type, count] of typeCounts) {
    tiles.push({ id: `projects-${type}`, label: PROJECT_TYPE_LABEL[type], tone: 'brand', icon: FiBriefcase, value: String(count) })
  }
  return tiles
}

export function buildAiCopilotMessage(winRate: number, pipelineValue: number): string {
  return `Win rate is at ${formatPercent(Math.round(winRate * 10) / 10, 1)}, with ${formatINR(pipelineValue)} in open pipeline.`
}
