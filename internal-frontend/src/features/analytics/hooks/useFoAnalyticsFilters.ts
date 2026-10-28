import { useFilterState } from '@/hooks/useFilterState'
import type { AnalyticsFilters } from '@/types/analytics.types'

// Lighter than useAnalyticsFilters — periodDays only. FOs aren't scoped to a single pharma client.
export interface FoAnalyticsFilters {
  periodDays: AnalyticsFilters['periodDays']
}

const DEFAULT_FILTERS: FoAnalyticsFilters = {
  periodDays: 90,
}

export const useFoAnalyticsFilters = () => useFilterState<FoAnalyticsFilters>(DEFAULT_FILTERS)
