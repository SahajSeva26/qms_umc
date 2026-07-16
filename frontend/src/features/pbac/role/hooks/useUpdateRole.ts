import { useMutation, useQueryClient } from '@tanstack/react-query'
import { pbacService } from '@/features/pbac/pbac.service'
import type { UpdateRolePayload } from '@/types/pbac.types'

// Mirrors `@/features/pbac/role-type/hooks/useUpdateRoleType.ts` exactly.
export const useUpdateRole = (id: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: UpdateRolePayload) => pbacService.updateRole(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role', id] })
      queryClient.invalidateQueries({ queryKey: ['roles'] })
    },
  })
}
