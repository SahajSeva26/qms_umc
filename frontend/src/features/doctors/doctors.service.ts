import axios from 'axios'
import api from '@/lib/api/api'
import type { ApiResponse, PaginatedResponse } from '@/types/common.types'
import type {
  BulkDoctorPayload,
  BulkDoctorResult,
  CreateDoctorPayload,
  DoctorEntity,
  SearchDoctorQuery,
  UpdateDoctorPayload,
} from '@/types/doctor.types'

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

// POST /doctors/bulk's 400 `data` can be a bad-payload `{ fields }` object,
// `null` (missing CSV), or the genuine full result — only the full shape is safe to return.
function isBulkDoctorResult(value: unknown): value is BulkDoctorResult {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return Array.isArray(v.errors)
    && typeof v.totalRows === 'number'
    && typeof v.validRows === 'number'
    && typeof v.invalidRows === 'number'
    && typeof v.created === 'number'
    && typeof v.failed === 'number'
}

const bulkCreateDoctors = async (payload: BulkDoctorPayload): Promise<BulkDoctorResult> => {
  const formData = new FormData()
  if (payload.tenant) formData.append('tenant', payload.tenant)
  formData.append('file', payload.file)

  try {
    const res = await api.post<ApiResponse<BulkDoctorResult>>('/doctors/bulk', formData)
    return res.data.data as BulkDoctorResult
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 400 && isBulkDoctorResult(err.response.data?.data)) {
      return err.response.data.data
    }
    throw err
  }
}

export const doctorsService = {
  searchDoctors,
  getDoctor,
  createDoctor,
  updateDoctor,
  bulkCreateDoctors,
}
