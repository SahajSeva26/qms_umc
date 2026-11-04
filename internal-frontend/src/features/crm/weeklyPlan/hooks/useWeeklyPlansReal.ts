import { useEntityQuery } from '@/hooks/useEntityQuery'
import { createEntityKeys } from '@/hooks/entityQueryKeys'
import { weeklyPlanRealService } from '@/features/crm/weeklyPlan/weeklyPlanReal.service'
import type { SearchWeeklyPlanQuery } from '@/types/weeklyPlan.types'

export const weeklyPlanRealKeys = createEntityKeys<SearchWeeklyPlanQuery>('weeklyPlansReal', 'weeklyPlanReal')

export const useWeeklyPlansReal = (query: SearchWeeklyPlanQuery, options?: { enabled?: boolean }) =>
  useEntityQuery(weeklyPlanRealKeys, (q) => weeklyPlanRealService.searchWeeklyPlans(q), query, options)
