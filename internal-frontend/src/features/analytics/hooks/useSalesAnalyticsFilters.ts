import { useFilterState } from '@/hooks/useFilterState'

// No "all time" — an artificially distant from date would force a huge daily trend response. 30/90/180/365 only.
export type SalesAnalyticsPeriodDays = 30 | 90 | 180 | 365

export interface SalesAnalyticsFilters {
  periodDays: SalesAnalyticsPeriodDays
}

const DEFAULT_FILTERS: SalesAnalyticsFilters = {
  periodDays: 90,
}

export const useSalesAnalyticsFilters = () => useFilterState<SalesAnalyticsFilters>(DEFAULT_FILTERS)
