import { useMutation, useQueryClient } from '@tanstack/react-query'
import { campsRealService } from '@/features/camps/campsReal.service'
import type { MoveCampStagePayload } from '@/types/campReal.types'

// Wraps PATCH /camps/:id/stage — the ONLY sanctioned way to change a camp's
// status (create/update never accept a status field). Requires a reason,
// enforced both by the backend's MoveStagePayloadSchema and by the caller UI.
export const useMoveCampStage = (id: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: MoveCampStagePayload) => campsRealService.moveCampStage(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campReal', id] })
      queryClient.invalidateQueries({ queryKey: ['campsReal'] })
    },
  })
}
