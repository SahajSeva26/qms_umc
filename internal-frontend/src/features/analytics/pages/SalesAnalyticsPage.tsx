import { usePermission } from '@/hooks/usePermission'
import { useLeadReport } from '@/features/crm/hooks/useLeadReport'
import { useSalesLeadSweep } from '@/features/analytics/hooks/useSalesLeadSweep'
import { buildTopAccounts } from '@/features/analytics/analytics.salesStats'
import { useSalesAnalyticsFilters, type SalesAnalyticsPeriodDays } from '@/features/analytics/hooks/useSalesAnalyticsFilters'
import { periodStartLocalDateString, todayLocalDateString } from '@/features/analytics/analytics.localDate'
import PeriodDaysFilter, { type PeriodDaysOption } from '@/features/analytics/components/PeriodDaysFilter'
import AnalyticsNotAvailable from '@/features/analytics/components/AnalyticsNotAvailable'
import SalesPipelineTab from '@/features/analytics/components/tabs/SalesPipelineTab'
import QueryStateBlock from '@/components/ui/QueryStateBlock'

const SALES_PERIOD_OPTIONS: PeriodDaysOption<SalesAnalyticsPeriodDays>[] = [
  { id: 30, label: 'Last 30 days' },
  { id: 90, label: 'Last 90 days' },
  { id: 180, label: 'Last 6 months' },
  { id: 365, label: 'Last 12 months' },
]

// GET /leads/report needs lead:manage specifically — tenant:manage/lead:search do NOT unlock it.
const SalesAnalyticsPage = () => {
  const { hasAnyPermission } = usePermission()
  const canViewReport = hasAnyPermission(['lead:manage'])
  const { filters, setFilter } = useSalesAnalyticsFilters()

  // Explicit local-calendar from/to — never "all time" (an unbounded trend window is a real
  // backend-load concern; see useSalesAnalyticsFilters.ts).
  const from = periodStartLocalDateString(filters.periodDays)
  const to = todayLocalDateString()
  const { report, isLoading: isReportLoading, isError: isReportError, refetch: refetchReport } = useLeadReport({ from, to }, canViewReport)
  // Full lead sweep (not /leads/report, which has no per-tenant facet) for "Top accounts by
  // value" — same period bound, same lead:manage gate.
  const { data: leads, isLoading: isSweepLoading, isError: isSweepError, refetch: refetchSweep } = useSalesLeadSweep(from, to, canViewReport)
  const topAccounts = leads ? buildTopAccounts(leads) : []

  const isLoading = isReportLoading || isSweepLoading
  const isError = isReportError || isSweepError
  const refetch = () => {
    if (isReportError) refetchReport()
    if (isSweepError) refetchSweep()
  }

  return (
    <div className="w-full">
      <div className="mb-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--qms-text-muted)' }}>
          Insights · Sales Analytics
        </p>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--qms-text)' }}>Sales Analytics</h1>
      </div>

      <PeriodDaysFilter value={filters.periodDays} onChange={(periodDays) => setFilter('periodDays', periodDays)} options={SALES_PERIOD_OPTIONS} />

      {!canViewReport ? (
        <AnalyticsNotAvailable reason="requires lead:manage" />
      ) : (
        <QueryStateBlock
          isLoading={isLoading}
          error={isError}
          loadingLabel="Loading sales analytics…"
          errorLabel="Failed to load sales analytics."
          onRetry={refetch}
        >
          {report && <SalesPipelineTab report={report} topAccounts={topAccounts} />}
        </QueryStateBlock>
      )}
    </div>
  )
}

export default SalesAnalyticsPage
