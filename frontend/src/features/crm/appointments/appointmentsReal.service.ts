import api from '@/lib/api/api'
import { validateApiResponse } from '@/lib/api/validateApiResponse'
import {
  AppointmentDetailResponseSchema,
  MoveAppointmentStageResponseSchema,
} from '@/features/crm/appointments/appointmentsReal.response-schemas'
import type { ApiResponse, PaginatedResponse } from '@/types/common.types'
import type {
  AppointmentEntity,
  CreateAppointmentPayload,
  MoveAppointmentStagePayload,
  RespondAppointmentPayload,
  SearchAppointmentQuery,
  UpdateAppointmentPayload,
} from '@/features/crm/appointments/appointment.types'

// Named "Real" (not replacing appointments.service.ts) since the existing
// localStorage-mock Meeting UI is being migrated in place.
const searchAppointments = async (query: SearchAppointmentQuery) => {
  const res = await api.get<PaginatedResponse<AppointmentEntity>>('/appointments', { params: query })
  return res.data
}

const getAppointment = async (id: string) => {
  const res = await api.get<ApiResponse<AppointmentEntity>>(`/appointments/${id}`)
  validateApiResponse(AppointmentDetailResponseSchema, res.data, `/appointments/${id}`)
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
  validateApiResponse(MoveAppointmentStageResponseSchema, res.data, `/appointments/${id}/stage`)
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
