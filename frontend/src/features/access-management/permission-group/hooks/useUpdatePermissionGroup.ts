import { useMutation, useQueryClient } from '@tanstack/react-query'
import { accessManagementService } from '@/features/access-management/accessManagement.service'
import type { UpdatePermissionGroupPayload } from '@/types/accessManagement.types'

// Mirrors `@/features/admin/hooks/useUpdateUser.ts` exactly.
export const useUpdatePermissionGroup = (id: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: UpdatePermissionGroupPayload) => accessManagementService.updatePermissionGroup(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permission-group', id] })
      queryClient.invalidateQueries({ queryKey: ['permission-groups'] })
    },
  })
}
