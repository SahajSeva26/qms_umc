import axios from 'axios'
import api from '@/lib/api/api'
import type { ApiResponse, PaginatedResponse } from '@/types/common.types'
import type {
  BulkMrPayload,
  BulkMrResult,
  BulkMrRowError,
  CreateDivisionPayload,
  DivisionEntity,
  SearchDivisionQuery,
  UpdateDivisionPayload,
} from '@/features/crm/crm.types'

const searchDivisions = async (query: SearchDivisionQuery) => {
  const res = await api.get<PaginatedResponse<DivisionEntity>>('/divisions', { params: query })
  return res.data
}

const getDivision = async (id: string) => {
  const res = await api.get<ApiResponse<DivisionEntity>>(`/divisions/${id}`)
  return res.data
}

const createDivision = async (payload: CreateDivisionPayload) => {
  const res = await api.post<ApiResponse<DivisionEntity>>('/divisions', payload)
  return res.data
}

const updateDivision = async (id: string, payload: UpdateDivisionPayload) => {
  const res = await api.put<ApiResponse<DivisionEntity>>(`/divisions/${id}`, payload)
  return res.data
}

// A 400 response's `data` is just the `errors` array (no totalRows/created/etc),
// so those fields stay undefined here rather than defaulting to a misleading 0.
const bulkCreateMr = async (payload: BulkMrPayload): Promise<BulkMrResult> => {
  const formData = new FormData()
  formData.append('division', payload.division)
  formData.append('supervisor', payload.supervisor)
  formData.append('tenant', payload.tenant)
  formData.append('file', payload.file)

  try {
    const res = await api.post<ApiResponse<BulkMrResult>>('/divisions/bulk-mr', formData)
    return res.data.data as BulkMrResult
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 400 && Array.isArray(err.response.data?.data)) {
      const errors = err.response.data.data as BulkMrRowError[]
      return { failed: errors.length, errors }
    }
    throw err
  }
}

export const divisionService = {
  searchDivisions,
  getDivision,
  createDivision,
  updateDivision,
  bulkCreateMr,
}
