import { useQuery } from '@tanstack/react-query'
import { accessManagementService } from '@/features/access-management/accessManagement.service'
import type { SearchPermissionGroupQuery } from '@/types/accessManagement.types'

// Mirrors `@/features/admin/hooks/useUsers.ts` exactly: a thin useQuery
// wrapper keyed on the raw search query so callers get free refetch-on-change.
export const usePermissionGroups = (query: SearchPermissionGroupQuery) => {
  return useQuery({
    queryKey: ['permission-groups', query],
    queryFn: () => accessManagementService.searchPermissionGroups(query),
  })
}
