import { useMutation, useQueryClient } from '@tanstack/react-query'
import { accessManagementService } from '@/features/access-management/accessManagement.service'
import type { CreateRoleTypePayload } from '@/types/accessManagement.types'

// Same shape as `@/features/access-management/tenant/hooks/useCreateTenant.ts` — invalidates
// the role-types list so a newly created role type shows up immediately
// without a manual refetch.
export const useCreateRoleType = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateRoleTypePayload) => accessManagementService.createRoleType(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-types'] })
    },
  })
}
