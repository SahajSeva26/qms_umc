import { useMutation, useQueryClient } from '@tanstack/react-query'
import { divisionService } from '@/features/crm/divisions/division.service'
import { roleKeys } from '@/features/access-management/role/hooks/useRoles'
import type { BulkMrPayload } from '@/features/crm/crm.types'

// Invalidates roleKeys.all, not 'divisions' — a successful run creates
// Role/User rows under this division, not a division itself.
export const useBulkCreateMr = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: BulkMrPayload) => divisionService.bulkCreateMr(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roleKeys.all })
    },
  })
}
