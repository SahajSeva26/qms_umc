import { useFilterState } from '@/hooks/useFilterState'

// No "all time" option — same reasoning as useSalesAnalyticsFilters.ts. 30/90/180/365 only.
export type FinancialAnalyticsPeriodDays = 30 | 90 | 180 | 365

export interface FinancialAnalyticsFilters {
  periodDays: FinancialAnalyticsPeriodDays
}

const DEFAULT_FILTERS: FinancialAnalyticsFilters = {
  periodDays: 90,
}

export const useFinancialAnalyticsFilters = () => useFilterState<FinancialAnalyticsFilters>(DEFAULT_FILTERS)
