import { useQuery } from '@tanstack/react-query'
import { accessManagementService } from '@/features/access-management/accessManagement.service'
import type { SearchRoleQuery } from '@/types/accessManagement.types'

// Mirrors `@/features/access-management/role-type/hooks/useRoleTypes.ts` exactly: a thin
// useQuery wrapper keyed on the raw search query so callers get free
// refetch-on-change. `tenant` is optional — RolesListPage shows every
// tenant's roles by default, narrowing to one only if the Tenant filter is
// set; UsersPage.tsx also calls this unscoped for its email→role lookup.
export const useRoles = (query: SearchRoleQuery) => {
  return useQuery({
    queryKey: ['roles', query],
    queryFn: () => accessManagementService.searchRoles(query),
  })
}
