import { useQuery } from '@tanstack/react-query'
import { adminService } from '@/features/admin/admin.service'
import type { UserReportQuery } from '@/types/userReport.types'

// Rate-limited on the backend (reportRateLimiter) and the underlying counts
// don't need to be second-fresh, so a short staleTime avoids re-running the
// aggregate on every mount/window-refocus.
const STALE_TIME_MS = 60_000

export const useUserReport = (query: UserReportQuery, enabled = true) =>
  useQuery({
    queryKey: ['users', 'report', query],
    queryFn: () => adminService.getUserReport(query),
    enabled,
    staleTime: STALE_TIME_MS,
  })
