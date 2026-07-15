import { useQuery } from '@tanstack/react-query'
import { getDashboardData } from '@/features/dashboard/dashboard.service'

// Shared wrapper around the Dashboard feature's aggregate data — lets other
// features (Analytics) read it without importing features/dashboard/
// internals directly. Mirrors useAuth.ts's role as the sanctioned shared
// surface over features/auth/.
export const useDashboardDataShared = () => {
  return useQuery({ queryKey: ['dashboard'], queryFn: getDashboardData })
}
