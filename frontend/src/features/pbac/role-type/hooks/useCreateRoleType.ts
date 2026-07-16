import { useMutation, useQueryClient } from '@tanstack/react-query'
import { pbacService } from '@/features/pbac/pbac.service'
import type { CreateRoleTypePayload } from '@/types/pbac.types'

// Same shape as `@/features/pbac/tenant/hooks/useCreateTenant.ts` — invalidates
// the role-types list so a newly created role type shows up immediately
// without a manual refetch.
export const useCreateRoleType = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateRoleTypePayload) => pbacService.createRoleType(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-types'] })
    },
  })
}
