import { useMutation, useQueryClient } from '@tanstack/react-query'
import { pbacService } from '@/features/pbac/pbac.service'
import type { UpdatePermissionGroupPayload } from '@/types/pbac.types'

// Mirrors `@/features/admin/hooks/useUpdateUser.ts` exactly.
export const useUpdatePermissionGroup = (id: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: UpdatePermissionGroupPayload) => pbacService.updatePermissionGroup(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permission-group', id] })
      queryClient.invalidateQueries({ queryKey: ['permission-groups'] })
    },
  })
}
