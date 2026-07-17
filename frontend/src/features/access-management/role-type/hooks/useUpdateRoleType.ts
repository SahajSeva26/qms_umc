import { useMutation, useQueryClient } from '@tanstack/react-query'
import { accessManagementService } from '@/features/access-management/accessManagement.service'
import type { UpdateRoleTypePayload } from '@/types/accessManagement.types'

// Mirrors `@/features/access-management/permission-group/hooks/useUpdatePermissionGroup.ts` exactly.
export const useUpdateRoleType = (id: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: UpdateRoleTypePayload) => accessManagementService.updateRoleType(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-type', id] })
      queryClient.invalidateQueries({ queryKey: ['role-types'] })
    },
  })
}
