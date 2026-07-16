import { useQuery } from '@tanstack/react-query'
import { pbacService } from '@/features/pbac/pbac.service'
import type { SearchRoleQuery } from '@/types/pbac.types'

// Mirrors `@/features/pbac/role-type/hooks/useRoleTypes.ts` exactly: a thin
// useQuery wrapper keyed on the raw search query so callers get free
// refetch-on-change. RolesListPage always passes a `tenant` (id) so results
// are scoped to a single tenant's roles — a Role is the "ID card" binding one
// user to one RoleType within that tenant.
export const useRoles = (query: SearchRoleQuery) => {
  return useQuery({
    queryKey: ['roles', query],
    queryFn: () => pbacService.searchRoles(query),
  })
}
