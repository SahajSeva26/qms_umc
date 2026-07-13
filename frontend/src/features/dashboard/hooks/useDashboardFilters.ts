import { useState } from 'react'

export interface DashboardFilterState {
  dateRange: string
  client: string
  division: string
  campType: string
  rep: string
  yoy: boolean
}

const DEFAULT_FILTERS: DashboardFilterState = {
  dateRange: 'QTD',
  client: 'All clients',
  division: 'All divisions',
  campType: 'All',
  rep: 'All reps',
  yoy: true,
}

// Mirrors the prototype's in-memory `state` object — no persistence,
// resets to defaults on every page load, matching dashboard.js exactly.
export const useDashboardFilters = () => {
  const [filters, setFilters] = useState<DashboardFilterState>(DEFAULT_FILTERS)

  const setFilter = <K extends keyof DashboardFilterState>(key: K, value: DashboardFilterState[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const reset = () => setFilters(DEFAULT_FILTERS)

  return { filters, setFilter, reset }
}
