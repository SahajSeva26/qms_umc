import { useQuery } from '@tanstack/react-query'
import { pbacService } from '@/features/pbac/pbac.service'
import type { SearchRoleTypeQuery } from '@/types/pbac.types'

// Mirrors `@/features/admin/hooks/useUsers.ts` / `usePermissionGroups.ts`
// exactly: a thin useQuery wrapper keyed on the raw search query so callers
// get free refetch-on-change. RoleTypesListPage always passes a `tenant`
// (id) so results are scoped to a single tenant's role types.
export const useRoleTypes = (query: SearchRoleTypeQuery) => {
  return useQuery({
    queryKey: ['role-types', query],
    queryFn: () => pbacService.searchRoleTypes(query),
  })
}
