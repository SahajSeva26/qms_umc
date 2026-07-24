import { useMutation, useQueryClient } from '@tanstack/react-query'
import { campsRealService } from '@/features/camps/campsReal.service'
import type { UpdateCampPayload } from '@/types/campReal.types'

export const useUpdateCamp = (id: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: UpdateCampPayload) => campsRealService.updateCamp(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campReal', id] })
      queryClient.invalidateQueries({ queryKey: ['campsReal'] })
    },
  })
}
