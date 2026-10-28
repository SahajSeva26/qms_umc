import type { AnalyticsFilters } from '@/types/analytics.types'
import { useFoAnalyticsFilters } from '@/features/analytics/hooks/useFoAnalyticsFilters'
import PeriodDaysFilter, { type PeriodDaysOption } from '@/features/analytics/components/PeriodDaysFilter'
import FoPerformanceTab from '@/features/analytics/components/tabs/FoPerformanceTab'

const FO_PERIOD_OPTIONS: PeriodDaysOption<AnalyticsFilters['periodDays']>[] = [
  { id: 30, label: 'Last 30 days' },
  { id: 90, label: 'Last 90 days' },
  { id: 180, label: 'Last 6 months' },
  { id: 365, label: 'Last 12 months' },
  { id: 'all', label: 'All time' },
]

// Deliberately does NOT run through AnalyticsPage/useAnalyticsData — that shell is mock-driven and
// would fire unrelated requests plus a fake "live" banner.
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

      <PeriodDaysFilter value={filters.periodDays} onChange={(periodDays) => setFilter('periodDays', periodDays)} options={FO_PERIOD_OPTIONS} />

      <FoPerformanceTab periodDays={filters.periodDays} />
    </div>
  )
}

export default FoAnalyticsPage
