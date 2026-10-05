import { useMutation, useQueryClient } from '@tanstack/react-query'
import { campsRealService } from '@/features/camps/campsReal.service'
import { CAMP_QUERY_NAMESPACES } from '@/types/campQueryKeys'
import type { VoidCampPayload } from '@/types/campReal.types'

// Mirrors useCreateCamp.ts — invalidates both namespaces in THIS browser's cache only.
export const useVoidCamp = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: VoidCampPayload) => campsRealService.voidCamp(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CAMP_QUERY_NAMESPACES.internal] })
      queryClient.invalidateQueries({ queryKey: [CAMP_QUERY_NAMESPACES.pharma] })
    },
  })
}
