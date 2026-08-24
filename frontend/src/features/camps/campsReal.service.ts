import api from '@/lib/api/api'
import type { ApiResponse, PaginatedResponse } from '@/types/common.types'
import type {
  BookCampPayload,
  CampEntity,
  CreateCampPayload,
  MoveCampStagePayload,
  SearchCampQuery,
  UpdateCampPayload,
} from '@/types/campReal.types'

// Real API calls against backend/src/modules/operations/camp/**. Deliberately
// separate from `camps.service.ts` (the old mock store ~100 files still depend on).

const searchCamps = async (query: SearchCampQuery) => {
  const res = await api.get<PaginatedResponse<CampEntity>>('/camps', { params: query })
  return res.data
}

const getCamp = async (id: string) => {
  const res = await api.get<ApiResponse<CampEntity>>(`/camps/${id}`)
  return res.data
}

const createCamp = async (payload: CreateCampPayload) => {
  const res = await api.post<ApiResponse<CampEntity>>('/camps', payload)
  return res.data
}

// Pharma field-force booking path — POST /camps/book, not /camps. Self vs
// downline authorization is enforced server-side by the caller's role type.
const bookCamp = async (payload: BookCampPayload) => {
  const res = await api.post<ApiResponse<CampEntity>>('/camps/book', payload)
  return res.data
}

const updateCamp = async (id: string, payload: UpdateCampPayload) => {
  const res = await api.put<ApiResponse<CampEntity>>(`/camps/${id}`, payload)
  return res.data
}

const moveCampStage = async (id: string, payload: MoveCampStagePayload) => {
  const res = await api.patch<ApiResponse<CampEntity>>(`/camps/${id}/stage`, payload)
  return res.data
}

const allocateFo = async (id: string) => {
  const res = await api.post<ApiResponse<CampEntity>>(`/camps/${id}/allocate`)
  return res.data
}

export const campsRealService = {
  searchCamps,
  getCamp,
  createCamp,
  bookCamp,
  updateCamp,
  moveCampStage,
  allocateFo,
}
