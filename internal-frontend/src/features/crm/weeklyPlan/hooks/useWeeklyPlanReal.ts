import { useGetEntity } from '@/hooks/useGetEntity'
import { weeklyPlanRealService } from '@/features/crm/weeklyPlan/weeklyPlanReal.service'
import { weeklyPlanRealKeys } from '@/features/crm/weeklyPlan/hooks/useWeeklyPlansReal'

export const useWeeklyPlanReal = (id: string | undefined) =>
  useGetEntity(weeklyPlanRealKeys.detail, weeklyPlanRealService.getWeeklyPlan, id)
