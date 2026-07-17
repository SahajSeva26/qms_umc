import { useState } from 'react'
import type { AnalyticsFilters } from '@/types/analytics.types'

const DEFAULT_FILTERS: AnalyticsFilters = {
  periodDays: 90,
  clientId: 'ALL',
}

// Mirrors the prototype's in-memory analytics state object — resets to
// defaults on every page load (period=90 default, matching analytics.js).
export const useAnalyticsFilters = () => {
  const [filters, setFilters] = useState<AnalyticsFilters>(DEFAULT_FILTERS)

  const setFilter = <K extends keyof AnalyticsFilters>(key: K, value: AnalyticsFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const reset = () => setFilters(DEFAULT_FILTERS)

  return { filters, setFilter, reset }
}
