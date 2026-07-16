import { useMutation, useQueryClient } from '@tanstack/react-query'
import { pbacService } from '@/features/pbac/pbac.service'
import type { CreateRolePayload } from '@/types/pbac.types'

// Mirrors `@/features/pbac/role-type/hooks/useCreateRoleType.ts` exactly —
// invalidates the roles list so a newly created role shows up immediately.
// CreateRolePayload embeds a full `user: RegisterOwnerPayload` registration
// payload (backend creates the RoleType-bound user + the Role together in a
// single transaction — see role.service.ts's `create`), same "embedded user"
// shape as CreateTenantPayload's `owner`.
export const useCreateRole = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateRolePayload) => pbacService.createRole(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] })
    },
  })
}
