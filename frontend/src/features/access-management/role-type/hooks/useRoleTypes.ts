import { useQuery } from '@tanstack/react-query'
import { accessManagementService } from '@/features/access-management/accessManagement.service'
import type { SearchRoleTypeQuery } from '@/types/accessManagement.types'

// Mirrors `@/features/admin/hooks/useUsers.ts` / `usePermissionGroups.ts`
// exactly: a thin useQuery wrapper keyed on the raw search query so callers
// get free refetch-on-change. `tenant` is optional — RoleTypesListPage shows
// every tenant's role types by default, narrowing to one only if the Tenant
// filter is set. `enabled` defaults to true for existing unscoped callers —
// added for CampDetailPageReal.tsx's lazy MR/ASM/RSM dropdown resolution
// (only resolve a RoleType once that specific Select has been opened).
export const useRoleTypes = (query: SearchRoleTypeQuery, enabled = true) => {
  return useQuery({
    queryKey: ['role-types', query],
    queryFn: () => accessManagementService.searchRoleTypes(query),
    enabled,
  })
}
