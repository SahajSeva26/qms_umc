import { useMutation, useQueryClient } from '@tanstack/react-query'
import { pbacService } from '@/features/pbac/pbac.service'
import type { UpdateRoleTypePayload } from '@/types/pbac.types'

// Mirrors `@/features/pbac/permission-group/hooks/useUpdatePermissionGroup.ts` exactly.
export const useUpdateRoleType = (id: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: UpdateRoleTypePayload) => pbacService.updateRoleType(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-type', id] })
      queryClient.invalidateQueries({ queryKey: ['role-types'] })
    },
  })
}
