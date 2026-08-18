import { useFilterState } from '@/hooks/useFilterState'
import { DEFAULT_DASHBOARD_FILTERS, type DashboardFilterState } from '@/types/dashboard.types'

// Lives in types/dashboard.types.ts since it's part of the service contract,
// not private UI state of this hook.
export type { DashboardFilterState }

// No persistence — resets to defaults on every page load.
export const useDashboardFilters = () => useFilterState<DashboardFilterState>(DEFAULT_DASHBOARD_FILTERS)
