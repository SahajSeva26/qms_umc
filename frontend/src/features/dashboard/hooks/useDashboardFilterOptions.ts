import { useQuery } from '@tanstack/react-query'
import { getDashboardFilterOptions } from '@/features/dashboard/dashboard.service'

// Filter-bar options are configuration, not metrics — they don't change with
// the selected filters, so they get their own cache entry and never go stale
// on their own. Separate from useDashboardData so selecting a filter never
// refetches the list of selectable filters.
export const useDashboardFilterOptions = () => {
  return useQuery({
    queryKey: ['dashboard', 'filter-options'],
    queryFn: getDashboardFilterOptions,
    staleTime: Infinity,
  })
}
