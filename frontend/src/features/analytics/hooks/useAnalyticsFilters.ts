import { useFilterState } from '@/hooks/useFilterState'
import type { AnalyticsFilters } from '@/types/analytics.types'

const DEFAULT_FILTERS: AnalyticsFilters = {
  periodDays: 90,
  clientId: 'ALL',
}

export const useAnalyticsFilters = () => useFilterState<AnalyticsFilters>(DEFAULT_FILTERS)
