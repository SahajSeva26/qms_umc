import api from '@/lib/api/api'
import type { ApiResponse, PaginatedResponse } from '@qms/core'
import type { CreateDoctorPayload, DoctorEntity, NearestDoctorQuery, SearchDoctorQuery, UpdateDoctorPayload } from '@/types/doctor.types'

// Mirrors internal-frontend's doctors.service.ts, trimmed to this app's needs — no
// bulkCreateDoctors, which no pharma-frontend tab uses yet.
const searchDoctors = async (query: SearchDoctorQuery) => {
  const res = await api.get<PaginatedResponse<DoctorEntity>>('/doctors', { params: query })
  return res.data
}

// 35km radius is server-fixed — no radius param exists to send.
const nearestDoctors = async (query: NearestDoctorQuery) => {
  const res = await api.get<PaginatedResponse<DoctorEntity>>('/doctors/nearest', { params: query })
  return res.data
}

const createDoctor = async (payload: CreateDoctorPayload) => {
  const res = await api.post<ApiResponse<DoctorEntity>>('/doctors', payload)
  return res.data
}

const updateDoctor = async (id: string, payload: UpdateDoctorPayload) => {
  const res = await api.put<ApiResponse<DoctorEntity>>(`/doctors/${id}`, payload)
  return res.data
}

export const doctorsService = {
  searchDoctors,
  nearestDoctors,
  createDoctor,
  updateDoctor,
}
