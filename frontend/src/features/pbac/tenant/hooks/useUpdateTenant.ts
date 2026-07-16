import { useMutation, useQueryClient } from '@tanstack/react-query'
import { pbacService } from '@/features/pbac/pbac.service'
import type { UpdateTenantPayload } from '@/types/pbac.types'

// Mirrors `@/features/admin/hooks/useUpdateUser.ts` exactly.
export const useUpdateTenant = (id: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: UpdateTenantPayload) => pbacService.updateTenant(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant', id] })
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
    },
  })
}
