import { useEntityQuery } from '@/hooks/useEntityQuery'
import { createEntityKeys } from '@/hooks/entityQueryKeys'
import { accessManagementService } from '@/features/access-management/accessManagement.service'
import type { SearchPermissionGroupQuery } from '@/types/accessManagement.types'

export const permissionGroupKeys = createEntityKeys<SearchPermissionGroupQuery>('permission-groups', 'permission-group')

// No create hook — permission groups are seeded/managed elsewhere, this
// feature only lists/views/updates them.
export const usePermissionGroups = (query: SearchPermissionGroupQuery) =>
  useEntityQuery(permissionGroupKeys, (q) => accessManagementService.searchPermissionGroups(q), query)
