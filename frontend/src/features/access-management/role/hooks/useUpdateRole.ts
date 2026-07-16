import { useMutation, useQueryClient } from '@tanstack/react-query'
import { accessManagementService } from '@/features/access-management/accessManagement.service'
import type { UpdateRolePayload } from '@/types/accessManagement.types'

// Mirrors `@/features/access-management/role-type/hooks/useUpdateRoleType.ts` exactly.
export const useUpdateRole = (id: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: UpdateRolePayload) => accessManagementService.updateRole(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role', id] })
      queryClient.invalidateQueries({ queryKey: ['roles'] })
    },
  })
}
