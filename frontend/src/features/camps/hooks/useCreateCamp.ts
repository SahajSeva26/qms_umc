import { useMutation, useQueryClient } from '@tanstack/react-query'
import { campsRealService } from '@/features/camps/campsReal.service'
import type { CreateCampPayload } from '@/types/campReal.types'

export const useCreateCamp = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateCampPayload) => campsRealService.createCamp(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campsReal'] })
    },
  })
}
