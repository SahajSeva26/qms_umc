import { useQuery } from '@tanstack/react-query'
import { accessManagementService } from '@/features/access-management/accessManagement.service'
import type { SearchTenantQuery } from '@/types/accessManagement.types'

// Mirrors `@/features/admin/hooks/useUsers.ts` exactly: a thin useQuery
// wrapper keyed on the raw search query so callers get free refetch-on-change.
export const useTenants = (query: SearchTenantQuery) => {
  return useQuery({
    queryKey: ['tenants', query],
    queryFn: () => accessManagementService.searchTenants(query),
  })
}
