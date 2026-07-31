import { useMutation, useQueryClient } from '@tanstack/react-query'
import { crmService } from '@/features/crm/crm.service'
import type { UpdateDivisionPayload } from '@/types/crm.types'

export const useUpdateDivision = (id: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: UpdateDivisionPayload) => crmService.updateDivision(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['divisions'] })
    },
  })
}
