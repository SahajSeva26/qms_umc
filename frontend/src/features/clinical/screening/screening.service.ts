import api from '@/lib/api/api'
import type { ApiResponse, PaginatedResponse } from '@/types/common.types'
import type {
  CreateScreeningPayload,
  MoveScreeningStagePayload,
  ScreeningEntity,
  SearchScreeningQuery,
  UpdateScreeningPayload,
} from '@/features/clinical/screening/screening.types'

const searchScreenings = async (query: SearchScreeningQuery) => {
  const res = await api.get<PaginatedResponse<ScreeningEntity>>('/screenings', { params: query })
  return res.data
}

const getScreening = async (id: string) => {
  const res = await api.get<ApiResponse<ScreeningEntity>>(`/screenings/${id}`)
  return res.data
}

const createScreening = async (payload: CreateScreeningPayload) => {
  const res = await api.post<ApiResponse<ScreeningEntity>>('/screenings', payload)
  return res.data
}

const updateScreening = async (id: string, payload: UpdateScreeningPayload) => {
  const res = await api.put<ApiResponse<ScreeningEntity>>(`/screenings/${id}`, payload)
  return res.data
}

const moveScreeningStage = async (id: string, payload: MoveScreeningStagePayload) => {
  const res = await api.patch<ApiResponse<ScreeningEntity>>(`/screenings/${id}/stage`, payload)
  return res.data
}

// verifyConsent is deliberately not wired — the backend never returns the OTP
// in any response, so no UI can populate the form this would back.

export const screeningService = {
  searchScreenings,
  getScreening,
  createScreening,
  updateScreening,
  moveScreeningStage,
}
