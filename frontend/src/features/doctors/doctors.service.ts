import api from '@/lib/api/api'
import type { ApiResponse, PaginatedResponse } from '@/types/common.types'
import type {
  CreateDoctorPayload,
  DoctorEntity,
  SearchDoctorQuery,
  UpdateDoctorPayload,
} from '@/types/doctor.types'

// Real backend-integrated Doctor service. Follows the exact pattern of
// `@/features/access-management/accessManagement.service.ts`: same shared
// `api` axios instance, same ApiResponse/PaginatedResponse envelope typing,
// a plain object export, no class/default export.

const searchDoctors = async (query: SearchDoctorQuery) => {
  const res = await api.get<PaginatedResponse<DoctorEntity>>('/doctors', { params: query })
  return res.data
}

const getDoctor = async (id: string) => {
  const res = await api.get<ApiResponse<DoctorEntity>>(`/doctors/${id}`)
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
  getDoctor,
  createDoctor,
  updateDoctor,
}
