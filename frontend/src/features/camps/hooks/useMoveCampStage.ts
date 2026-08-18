import { useMutation, useQueryClient } from '@tanstack/react-query'
import { campsRealService } from '@/features/camps/campsReal.service'
import { campRealKeys } from '@/features/camps/hooks/useCampsReal'
import type { MoveCampStagePayload } from '@/types/campReal.types'

// Only sanctioned way to change a camp's status — create/update never accept a status field.
export const useMoveCampStage = (id: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: MoveCampStagePayload) => campsRealService.moveCampStage(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: campRealKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: campRealKeys.all })
    },
  })
}
