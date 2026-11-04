import { useEntityQuery } from '@/hooks/useEntityQuery'
import { createEntityKeys } from '@/hooks/entityQueryKeys'
import { accessManagementService } from '@/features/access-management/accessManagement.service'
import type { SearchRoleTypeQuery } from '@/types/accessManagement.types'

export const roleTypeKeys = createEntityKeys<SearchRoleTypeQuery>('role-types', 'role-type')

// `enabled` lets callers defer the query until it's actually needed (e.g. a lazy dropdown).
export const useRoleTypes = (query: SearchRoleTypeQuery, enabled = true) =>
  useEntityQuery(roleTypeKeys, (q) => accessManagementService.searchRoleTypes(q), query, { enabled })
