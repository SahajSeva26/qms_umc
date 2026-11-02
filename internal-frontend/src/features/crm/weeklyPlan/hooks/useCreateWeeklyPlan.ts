import { useCreateEntity } from '@/hooks/useCreateEntity'
import { weeklyPlanRealService } from '@/features/crm/weeklyPlan/weeklyPlanReal.service'
import { weeklyPlanRealKeys } from '@/features/crm/weeklyPlan/hooks/useWeeklyPlansReal'
import type { CreateWeeklyPlanPayload } from '@/types/weeklyPlan.types'

export const useCreateWeeklyPlan = () =>
  useCreateEntity((payload: CreateWeeklyPlanPayload) => weeklyPlanRealService.createWeeklyPlan(payload), weeklyPlanRealKeys.all)
