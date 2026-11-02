import api from '@/lib/api/api'
import type { ApiResponse, PaginatedResponse } from '@/types/common.types'
import type {
  CreateWeeklyPlanPayload,
  MoveWeeklyPlanStagePayload,
  SearchWeeklyPlanQuery,
  UpdateWeeklyPlanPayload,
  WeeklyPlanEntity,
} from '@/types/weeklyPlan.types'

const searchWeeklyPlans = async (query: SearchWeeklyPlanQuery) => {
  const res = await api.get<PaginatedResponse<WeeklyPlanEntity>>('/weekly-plans', { params: query })
  return res.data
}

const getWeeklyPlan = async (id: string) => {
  const res = await api.get<ApiResponse<WeeklyPlanEntity>>(`/weekly-plans/${id}`)
  return res.data
}

const createWeeklyPlan = async (payload: CreateWeeklyPlanPayload) => {
  const res = await api.post<ApiResponse<WeeklyPlanEntity>>('/weekly-plans', payload)
  return res.data
}

const updateWeeklyPlan = async (id: string, payload: UpdateWeeklyPlanPayload) => {
  const res = await api.put<ApiResponse<WeeklyPlanEntity>>(`/weekly-plans/${id}`, payload)
  return res.data
}

const moveWeeklyPlanStage = async (id: string, payload: MoveWeeklyPlanStagePayload) => {
  const res = await api.patch<ApiResponse<WeeklyPlanEntity>>(`/weekly-plans/${id}/stage`, payload)
  return res.data
}

export const weeklyPlanRealService = {
  searchWeeklyPlans,
  getWeeklyPlan,
  createWeeklyPlan,
  updateWeeklyPlan,
  moveWeeklyPlanStage,
}
