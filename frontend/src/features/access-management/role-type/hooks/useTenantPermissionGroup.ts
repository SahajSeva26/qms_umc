import { useQuery } from '@tanstack/react-query'
import { accessManagementService } from '@/features/access-management/accessManagement.service'

// NOT one of the four hooks named in the task list, but required to build the
// "ceiling" picker described in the task: a RoleType's pickable permissions
// are NOT the full 27-code catalog, they're limited to whatever permissions
// the TENANT'S OWN PermissionGroup contains. This mirrors backend
// `roleType.service.ts`'s `handlePermissionUpdate`, which resolves the
// ceiling via `PermissionGroupService.search({ tenant: ctx.tenant._id })`
// and takes `items[0]` (a tenant has exactly one PermissionGroup).
//
// Reuses the existing `searchPermissionGroups` service call (scoped by
// `tenant`) rather than adding a new endpoint — there is no
// "get permission group by tenant id" route, only search.
export const useTenantPermissionGroup = (tenantId: string | undefined) => {
  const query = useQuery({
    queryKey: ['permission-groups', { tenant: tenantId }],
    queryFn: () => accessManagementService.searchPermissionGroups({ tenant: tenantId }),
    enabled: !!tenantId,
  })

  const permissionGroup = query.data?.data?.items?.[0] ?? null

  return {
    ...query,
    permissionGroup,
  }
}
