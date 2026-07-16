import { useMutation, useQueryClient } from '@tanstack/react-query'
import { pbacService } from '@/features/pbac/pbac.service'
import type { CreateTenantPayload } from '@/types/pbac.types'

// Same shape as `@/features/admin/hooks/useUpdateUser.ts` but for a create
// call — invalidates the tenants list so a newly created tenant shows up
// immediately without a manual refetch.
export const useCreateTenant = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateTenantPayload) => pbacService.createTenant(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
    },
  })
}
