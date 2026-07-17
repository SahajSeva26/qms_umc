import { useMutation, useQueryClient } from '@tanstack/react-query'
import { accessManagementService } from '@/features/access-management/accessManagement.service'
import type { UpdateTenantPayload } from '@/types/accessManagement.types'

// Mirrors `@/features/admin/hooks/useUpdateUser.ts` exactly.
export const useUpdateTenant = (id: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: UpdateTenantPayload) => accessManagementService.updateTenant(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant', id] })
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
    },
  })
}
