import { useMutation, useQueryClient } from '@tanstack/react-query'
import { weeklyPlanRealService } from '@/features/crm/weeklyPlan/weeklyPlanReal.service'
import { weeklyPlanRealKeys } from '@/features/crm/weeklyPlan/hooks/useWeeklyPlansReal'
import type { MoveWeeklyPlanStagePayload } from '@/types/weeklyPlan.types'

// The only way to change a weekly plan's status — create/update never accept a status field.
export const useMoveWeeklyPlanStage = (id: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: MoveWeeklyPlanStagePayload) => weeklyPlanRealService.moveWeeklyPlanStage(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: weeklyPlanRealKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: weeklyPlanRealKeys.all })
    },
  })
}
