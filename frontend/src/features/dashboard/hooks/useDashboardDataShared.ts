import { useQuery } from '@tanstack/react-query'
import { getDashboardData } from '@/features/dashboard/dashboard.service'
import { DEFAULT_DASHBOARD_FILTERS } from '@/features/dashboard/dashboard.types'

// Shared wrapper around the Dashboard feature's aggregate data — lets other
// features (Analytics) read it without importing features/dashboard/
// internals directly. Mirrors useAuth.ts's role as the sanctioned shared
// surface over features/auth/.
//
// Reads the unfiltered/default view: Analytics applies its own filtering and
// has no dependency on the Dashboard's filter bar. The key mirrors
// useDashboardData's `['dashboard', filters]` shape so that when Analytics and
// the Dashboard are both mounted at defaults they share one cache entry
// instead of fetching the same payload twice.
export const useDashboardDataShared = () => {
  return useQuery({
    queryKey: ['dashboard', DEFAULT_DASHBOARD_FILTERS],
    queryFn: () => getDashboardData(DEFAULT_DASHBOARD_FILTERS),
  })
}
