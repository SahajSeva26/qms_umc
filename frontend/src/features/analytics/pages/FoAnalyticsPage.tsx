import { useFoAnalyticsFilters } from '@/features/analytics/hooks/useFoAnalyticsFilters'
import FoAnalyticsPeriodFilter from '@/features/analytics/components/FoAnalyticsPeriodFilter'
import FoPerformanceTab from '@/features/analytics/components/tabs/FoPerformanceTab'

// Deliberately does NOT run through AnalyticsPage/useAnalyticsData — that shared shell is still
// mock-driven and would fire unrelated requests, a fake "live" banner, and a client filter that
// doesn't apply to field officers.
const FoAnalyticsPage = () => {
  const { filters, setFilter } = useFoAnalyticsFilters()

  return (
    <div className="w-full">
      <div className="mb-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--qms-text-muted)' }}>
          Insights · FO Analytics
        </p>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--qms-text)' }}>FO Analytics</h1>
      </div>

      <FoAnalyticsPeriodFilter periodDays={filters.periodDays} onChange={(periodDays) => setFilter('periodDays', periodDays)} />

      <FoPerformanceTab periodDays={filters.periodDays} />
    </div>
  )
}

export default FoAnalyticsPage
