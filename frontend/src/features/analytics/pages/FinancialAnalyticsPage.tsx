import { usePermission } from '@/hooks/usePermission'
import { useInvoiceReport, useInvoices } from '@/features/billing'
import { useFinancialAnalyticsFilters, type FinancialAnalyticsPeriodDays } from '@/features/analytics/hooks/useFinancialAnalyticsFilters'
import { periodStartLocalDateString, todayLocalDateString } from '@/features/analytics/analytics.localDate'
import PeriodDaysFilter, { type PeriodDaysOption } from '@/features/analytics/components/PeriodDaysFilter'
import AnalyticsNotAvailable from '@/features/analytics/components/AnalyticsNotAvailable'
import FinancialSummaryTab from '@/features/analytics/components/tabs/FinancialSummaryTab'
import QueryStateBlock from '@/components/ui/QueryStateBlock'

const FINANCIAL_PERIOD_OPTIONS: PeriodDaysOption<FinancialAnalyticsPeriodDays>[] = [
  { id: 30, label: 'Last 30 days' },
  { id: 90, label: 'Last 90 days' },
  { id: 180, label: 'Last 6 months' },
  { id: 365, label: 'Last 12 months' },
]

// GET /invoices/report and GET /invoices share one gate (invoice:search/manage or tenant:manage),
// so an authorized load fires exactly two requests and an unauthorized one fires zero.
const FinancialAnalyticsPage = () => {
  const { hasAnyPermission } = usePermission()
  const canView = hasAnyPermission(['invoice:search', 'invoice:manage', 'tenant:manage'])
  const { filters, setFilter } = useFinancialAnalyticsFilters()

  // Explicit local-calendar dateFrom/dateTo — no "all time" (same reasoning as Sales Analytics).
  const dateFrom = periodStartLocalDateString(filters.periodDays)
  const dateTo = todayLocalDateString()

  const { report, isLoading: isReportLoading, isError: isReportError, refetch: refetchReport } = useInvoiceReport({ dateFrom, dateTo }, canView, { retry: false })
  const { data: invoicesRes, isLoading: isInvoicesLoading, isError: isInvoicesError, refetch: refetchInvoices } = useInvoices({ dateFrom, dateTo, limit: '10' }, canView, { retry: false })

  const isLoading = isReportLoading || isInvoicesLoading
  const isError = isReportError || isInvoicesError
  const refetch = () => {
    if (isReportError) refetchReport()
    if (isInvoicesError) refetchInvoices()
  }

  return (
    <div className="w-full">
      <div className="mb-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--qms-text-muted)' }}>
          Insights · Financial Analytics
        </p>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--qms-text)' }}>Financial Analytics</h1>
      </div>

      <PeriodDaysFilter value={filters.periodDays} onChange={(periodDays) => setFilter('periodDays', periodDays)} options={FINANCIAL_PERIOD_OPTIONS} />

      {!canView ? (
        <AnalyticsNotAvailable reason="requires invoice:search, invoice:manage, or tenant:manage" />
      ) : (
        <QueryStateBlock
          isLoading={isLoading}
          error={isError}
          loadingLabel="Loading financial analytics…"
          errorLabel="Failed to load financial analytics."
          onRetry={refetch}
        >
          {report && invoicesRes && <FinancialSummaryTab report={report} recentInvoices={invoicesRes.data.items} />}
        </QueryStateBlock>
      )}
    </div>
  )
}

export default FinancialAnalyticsPage
