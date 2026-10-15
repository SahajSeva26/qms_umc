import { useMutation, useQueryClient } from '@tanstack/react-query'
import { campsRealService } from '@/features/camps/campsReal.service'
import { campRealKeys } from '@/features/camps/hooks/useCampsReal'
import type { ActivateCampPayload } from '@/types/campReal.types'

// The camp's assigned FO/dietitian starts their own confirmed camp on site — distinct from
// useMoveCampStage, which only camp:manage/tenant:manage holders can call.
export const useActivateCamp = (id: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: ActivateCampPayload) => campsRealService.activateCamp(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: campRealKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: campRealKeys.all })
    },
  })
}
