import { useMutation, useQueryClient } from '@tanstack/react-query'
import { screeningService } from '@/features/clinical/screening/screening.service'
import { screeningKeys } from '@/features/clinical/screening/hooks/useScreenings'
import type { MoveScreeningStagePayload } from '@/features/clinical/screening/screening.types'
import { toast } from '@/components/ui/sonner'
import { getApiErrorMessage } from '@/utils/apiError'

// Backs the "Mark completed" / "Cancel" actions — the backend has one
// moveStage(to, reason) endpoint, no separate complete/cancel endpoints.
export const useMoveScreeningStage = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: MoveScreeningStagePayload }) =>
      screeningService.moveScreeningStage(id, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: screeningKeys.all })
      queryClient.invalidateQueries({ queryKey: screeningKeys.detail(variables.id) })
      toast.success('Screening status updated')
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Could not update status — try again.')),
  })
}
