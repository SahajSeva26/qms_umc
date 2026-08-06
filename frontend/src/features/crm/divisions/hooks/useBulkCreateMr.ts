import { useMutation, useQueryClient } from '@tanstack/react-query'
import { crmService } from '@/features/crm/crm.service'
import type { BulkMrPayload } from '@/types/crm.types'

// Mirrors useCreateDivision.ts's shape. Invalidates 'roles' (not 'divisions')
// since a successful run creates Role/User rows under this division, not a
// division itself — DivisionsTable/DivisionDetailPage never read a role list,
// so nothing here needs the 'divisions' cache invalidated.
export const useBulkCreateMr = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: BulkMrPayload) => crmService.bulkCreateMr(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] })
    },
  })
}
