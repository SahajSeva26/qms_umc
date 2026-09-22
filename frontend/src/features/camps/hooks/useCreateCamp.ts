import { useMutation, useQueryClient } from '@tanstack/react-query'
import { campsRealService } from '@/features/camps/campsReal.service'
import { CAMP_QUERY_NAMESPACES } from '@/types/campQueryKeys'
import type { CreateCampPayload } from '@/types/campReal.types'

// Invalidates both namespaces in THIS browser's cache only — a different user's own open tab still needs its own refetch/poll.
export const useCreateCamp = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateCampPayload) => campsRealService.createCamp(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CAMP_QUERY_NAMESPACES.internal] })
      queryClient.invalidateQueries({ queryKey: [CAMP_QUERY_NAMESPACES.pharma] })
    },
  })
}
