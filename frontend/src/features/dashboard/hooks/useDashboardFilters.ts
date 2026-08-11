import { useState } from 'react'
import { DEFAULT_DASHBOARD_FILTERS, type DashboardFilterState } from '@/types/dashboard.types'

// `DashboardFilterState` / `DEFAULT_DASHBOARD_FILTERS` live in
// types/dashboard.types.ts because they are part of the service contract (the
// data source is scoped by them), not private UI state of this hook.
export type { DashboardFilterState }

// Mirrors the prototype's in-memory `state` object — no persistence,
// resets to defaults on every page load, matching dashboard.js exactly.
export const useDashboardFilters = () => {
  const [filters, setFilters] = useState<DashboardFilterState>(DEFAULT_DASHBOARD_FILTERS)

  const setFilter = <K extends keyof DashboardFilterState>(key: K, value: DashboardFilterState[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const reset = () => setFilters(DEFAULT_DASHBOARD_FILTERS)

  return { filters, setFilter, reset }
}
