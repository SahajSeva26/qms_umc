import { useMutation, useQueryClient } from '@tanstack/react-query'
import { accessManagementService } from '@/features/access-management/accessManagement.service'
import { roleKeys } from '@/features/access-management/role/hooks/useRoles'
import { userKeys } from '@/features/admin/hooks/useUsers'
import type { CreateRolePayload } from '@/types/accessManagement.types'

// A role create also creates its bound user in the same transaction, so
// userKeys.all must invalidate too, not just roleKeys.all.
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
