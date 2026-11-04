import { useUpdateEntity } from '@/hooks/useUpdateEntity'
import { weeklyPlanRealService } from '@/features/crm/weeklyPlan/weeklyPlanReal.service'
import { weeklyPlanRealKeys } from '@/features/crm/weeklyPlan/hooks/useWeeklyPlansReal'
import type { UpdateWeeklyPlanPayload } from '@/types/weeklyPlan.types'

export const useUpdateWeeklyPlan = (id: string) =>
  useUpdateEntity(
    (payload: UpdateWeeklyPlanPayload) => weeklyPlanRealService.updateWeeklyPlan(id, payload),
    [weeklyPlanRealKeys.detail(id), weeklyPlanRealKeys.all],
  )
