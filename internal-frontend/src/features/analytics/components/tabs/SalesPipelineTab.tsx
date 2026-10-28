import { useMemo } from 'react'
import { FiFilter, FiTrendingUp, FiGrid, FiBriefcase, FiAward, FiTarget, FiPercent, FiClock, FiUser } from 'react-icons/fi'
import type { LeadReportResponse } from '@/types/crm.types'
import { LEAD_STATUS_LABEL, LEAD_STATUS_COLOR, LEAD_STATUS_ON_COLOR, LEAD_PROJECT_TYPE_LABEL } from '@/types/crm.types'
import type { TopAccountRow } from '@/features/analytics/analytics.salesStats'
import { formatINR } from '@/utils/formatters'
import AnalyticsSectionCard from '@/features/analytics/components/AnalyticsSectionCard'
import FunnelChart from '@/features/analytics/components/charts/FunnelChart'
import LineChart from '@/features/analytics/components/charts/LineChart'
import BarsHorizontal from '@/features/analytics/components/charts/BarsHorizontal'
import KpiTile from '@/components/ui/KpiTile'

interface SalesPipelineTabProps {
  report: LeadReportResponse
  // Built client-side from a real lead sweep (see SalesAnalyticsPage.tsx) — /leads/report has no per-tenant facet.
  topAccounts: TopAccountRow[]
}

// Every real LeadStatus — funnelRows below fills in 0 for any status report.byStatus doesn't
// include, nothing collapsed or invented.
const FUNNEL_STATUSES: (keyof typeof LEAD_STATUS_LABEL)[] = ['new', 'qualified', 'proposal', 'pilot', 'negotiation', 'won', 'lost']

// Per-stage monetary values, a lost-value aggregate, a lost-reason breakdown, and a full
// per-rep leaderboard have no backend source and are deliberately not shown.
const SalesPipelineTab = ({ report, topAccounts }: SalesPipelineTabProps) => {
  const funnelRows = useMemo(() => {
    const countByStatus = new Map(report.byStatus.map((s) => [s.status, s.count]))
    return FUNNEL_STATUSES.map((status) => ({
      label: LEAD_STATUS_LABEL[status],
      count: countByStatus.get(status) ?? 0,
      color: LEAD_STATUS_COLOR[status],
      onColor: LEAD_STATUS_ON_COLOR[status],
    }))
  }, [report.byStatus])

  const projectTypeBars = useMemo(
    () =>
      report.byProjectType.map((p) => ({
        label: LEAD_PROJECT_TYPE_LABEL[p.projectType],
        value: p.count,
        formattedValue: String(p.count),
      })),
    [report.byProjectType],
  )

  const trendLabels = report.trends.newLeads.data.map((p) => p.period)
  const trendSeries = [{ label: 'New leads', color: '#3b6dff', data: report.trends.newLeads.data.map((p) => p.count) }]

  const topAccountBars = useMemo(
    () => topAccounts.map((a) => ({ label: a.tenant, value: a.value, formattedValue: formatINR(a.value) })),
    [topAccounts],
  )

  const { summary, kpis } = report

  return (
    <div className="flex flex-col gap-3.5">
      <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <KpiTile label="Pipeline value" value={formatINR(kpis.pipelineValue)} sub="current, open leads" tone="brand" icon={FiBriefcase} />
        <KpiTile label="Won value" value={formatINR(kpis.wonValue)} sub={`selected period · ${kpis.wonCount} won`} tone="emerald" icon={FiAward} />
        <KpiTile label="Win rate" value={`${kpis.winRate}%`} sub="selected period" tone="teal" icon={FiPercent} />
        <KpiTile label="Avg deal size" value={formatINR(kpis.avgDealSize)} sub="all-time, won leads" tone="violet" icon={FiTarget} />
        <KpiTile label="Sales velocity" value={`${kpis.salesVelocityDays}d`} sub="all-time, created → won" tone="amber" icon={FiClock} />
        <KpiTile
          label="Top rep"
          value={kpis.topRep ? formatINR(kpis.topRep.wonValue) : '—'}
          sub={kpis.topRep ? `all-time · ${kpis.topRep.name} · ${kpis.topRep.wonCount} won` : 'all-time — no won leads yet'}
          tone="rose"
          icon={FiUser}
        />
      </div>

      {/* Fixed 2-column grid (not auto-fit) so these 4 cards always form a 2x2, regardless of viewport width. */}
      <div className="grid gap-3.5 grid-cols-2 max-[900px]:grid-cols-1">
        <AnalyticsSectionCard
          icon={FiFilter}
          iconGradient="linear-gradient(135deg, var(--chart-1), var(--qms-teal))"
          title="Pipeline funnel"
          subtitle={`${summary.totalLeads} leads · current, all-time status counts`}
        >
          <FunnelChart rows={funnelRows} />
        </AnalyticsSectionCard>

        <AnalyticsSectionCard
          icon={FiTrendingUp}
          iconGradient="linear-gradient(135deg, #10b981, var(--chart-2))"
          title="New leads trend"
          subtitle="Selected period"
        >
          <LineChart series={trendSeries} labels={trendLabels} formatY={(v) => String(v)} />
        </AnalyticsSectionCard>

        <AnalyticsSectionCard
          icon={FiGrid}
          iconGradient="linear-gradient(135deg, var(--chart-3), #a855f7)"
          title="Leads by project type"
          subtitle="Current, all-time"
        >
          <BarsHorizontal bars={projectTypeBars} />
        </AnalyticsSectionCard>

        <AnalyticsSectionCard
          icon={FiBriefcase}
          iconGradient="linear-gradient(135deg, var(--chart-5), #10b981)"
          title="Top accounts by value"
          subtitle="Top 10 · selected period"
        >
          <BarsHorizontal bars={topAccountBars} />
        </AnalyticsSectionCard>
      </div>
    </div>
  )
}

export default SalesPipelineTab
