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

// POST /doctors/bulk has THREE distinct 400-producing shapes: (1) a bad
// payload — `{ fields: {...} }` — when BulkDoctorPayloadSchema itself fails
// (e.g. a malformed tenant id); (2) `data: null` when the CSV file is
// missing; (3) the genuine full result object when the CSV parsed but some/
// all rows failed. Only (3) is safe to return as a BulkDoctorResult — the
// other two must still propagate as real errors, not be miscast into a
// result the UI would render as nonsense (or crash on a missing `errors`
// array). Unlike divisionService.bulkCreateMr's bare `Array.isArray` check
// (correct for MR bulk, which only ever puts a bare errors array in `data`
// on its 400 path), doctor bulk's 400 `data` IS the full result object, so
// the check here has to verify the whole shape, not just "is it an array".
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
