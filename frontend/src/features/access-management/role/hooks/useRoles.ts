import { useEntityQuery } from '@/hooks/useEntityQuery'
import { createEntityKeys } from '@/hooks/entityQueryKeys'
import { accessManagementService } from '@/features/access-management/accessManagement.service'
import type { SearchRoleQuery } from '@/features/access-management/accessManagement.types'

export const roleKeys = createEntityKeys<SearchRoleQuery>('roles', 'role')

// `enabled` lets callers (e.g. UsersPage's email→tenant lookup) defer the query until needed.
export const useRoles = (query: SearchRoleQuery, enabled = true) =>
  useEntityQuery(roleKeys, (q) => accessManagementService.searchRoles(q), query, { enabled })
