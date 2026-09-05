import { useMutation, useQueryClient } from '@tanstack/react-query'
import { accessManagementService } from '@/features/access-management/accessManagement.service'
import { roleKeys } from '@/features/access-management/role/hooks/useRoles'
import { userKeys } from '@/features/admin/hooks/useUsers'
import type { CreateRolePayload } from '@/types/accessManagement.types'

// CreateRolePayload embeds a full `user: RegisterOwnerPayload` — backend creates
// the RoleType-bound user + Role together in one transaction (role.service.ts's `create`).
// Not a plain useCreateEntity(payload, roleKeys.all): a role create is ALSO a
// user create, so ['users'] (userKeys.all) must invalidate too — otherwise an
// already-open Users list/KPI strip keeps its stale cached count/data for up
// to useUsers'/useUserReport's own staleTime after a role (and its user) is
// created here.
export const useCreateRole = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateRolePayload) => accessManagementService.createRole(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roleKeys.all })
      queryClient.invalidateQueries({ queryKey: userKeys.all })
    },
  })
}
