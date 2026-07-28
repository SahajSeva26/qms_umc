import api from '@/lib/api/api'
import type { ApiResponse, PaginatedResponse } from '@/types/common.types'
import type {
  AppointmentEntity,
  CreateAppointmentPayload,
  MoveAppointmentStagePayload,
  RespondAppointmentPayload,
  SearchAppointmentQuery,
  UpdateAppointmentPayload,
} from '@/types/appointment.types'

// Real backend-integrated Appointment service. Follows the exact pattern of
// `@/features/camps/campsReal.service.ts` — same shared `api` axios
// instance, same ApiResponse/PaginatedResponse envelope typing. Named
// "Real" (not replacing appointments.service.ts) since the existing
// localStorage-mock Meeting UI is being migrated in place, same as Camp's
// mock->real transition.

const searchAppointments = async (query: SearchAppointmentQuery) => {
  const res = await api.get<PaginatedResponse<AppointmentEntity>>('/appointments', { params: query })
  return res.data
}

const getAppointment = async (id: string) => {
  const res = await api.get<ApiResponse<AppointmentEntity>>(`/appointments/${id}`)
  return res.data
}

const createAppointment = async (payload: CreateAppointmentPayload) => {
  const res = await api.post<ApiResponse<AppointmentEntity>>('/appointments', payload)
  return res.data
}

const updateAppointment = async (id: string, payload: UpdateAppointmentPayload) => {
  const res = await api.put<ApiResponse<AppointmentEntity>>(`/appointments/${id}`, payload)
  return res.data
}

const moveAppointmentStage = async (id: string, payload: MoveAppointmentStagePayload) => {
  const res = await api.patch<ApiResponse<AppointmentEntity>>(`/appointments/${id}/stage`, payload)
  return res.data
}

const respondToAppointment = async (id: string, payload: RespondAppointmentPayload) => {
  const res = await api.patch<ApiResponse<AppointmentEntity>>(`/appointments/${id}/rsvp`, payload)
  return res.data
}

export const appointmentsRealService = {
  searchAppointments,
  getAppointment,
  createAppointment,
  updateAppointment,
  moveAppointmentStage,
  respondToAppointment,
}
