import { useMutation, useQueryClient } from '@tanstack/react-query'
import { crmService } from '@/features/crm/crm.service'
import type { CreateDivisionPayload } from '@/types/crm.types'

// Reuses crmService's existing, real backend-wired createDivision (built
// during the CRM/Lead migration) — same endpoint CRM's own wizard reads
// from, just consumed here by the tenant-admin-facing Divisions screen
// instead. Mirrors useCreateRoleType.ts's shape.
export const useCreateDivision = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateDivisionPayload) => crmService.createDivision(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['divisions'] })
    },
  })
}
