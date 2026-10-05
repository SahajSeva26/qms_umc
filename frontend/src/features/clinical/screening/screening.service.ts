import api from '@/lib/api/api'
import type { ApiResponse, PaginatedResponse } from '@/types/common.types'
import type {
  CreateScreeningPayload,
  MoveScreeningStagePayload,
  RequestConsentOtpResponse,
  ScreeningEntity,
  SearchScreeningQuery,
  UpdateScreeningPayload,
  VerifyConsentPayload,
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

// TEMP: returns the generated code directly — no delivery sender exists yet.
const requestConsentOtp = async (id: string) => {
  const res = await api.post<ApiResponse<RequestConsentOtpResponse>>(`/screenings/${id}/request-consent-otp`)
  return res.data
}

const verifyConsent = async (id: string, payload: VerifyConsentPayload) => {
  const res = await api.post<ApiResponse<ScreeningEntity>>(`/screenings/${id}/verify-consent`, payload)
  return res.data
}

export const screeningService = {
  searchScreenings,
  getScreening,
  createScreening,
  updateScreening,
  moveScreeningStage,
  requestConsentOtp,
  verifyConsent,
}
