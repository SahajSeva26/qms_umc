import { useQuery } from '@tanstack/react-query'
import { getCommandCenterData } from '@/features/dashboard/dashboard.service'

// Sales Command Center payload (quarter label + task list). Rendered for
// super_admin only, so callers gate it with `enabled` rather than fetching and
// discarding.
export const useCommandCenterData = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ['dashboard', 'command-center'],
    queryFn: getCommandCenterData,
    enabled: options?.enabled ?? true,
  })
}
