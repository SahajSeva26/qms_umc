import api from '@/lib/api/api'
import type { ApiResponse, PaginatedResponse } from '@/types/common.types'
import type {
  CampEntity,
  CreateCampPayload,
  MoveCampStagePayload,
  SearchCampQuery,
  UpdateCampPayload,
} from '@/types/campReal.types'

// Real API calls against backend/src/modules/operations/camp/**. Deliberately
// a separate file from `camps.service.ts` (the old, still-in-use mock/
// localStorage store ~100 files across the app depend on) — see
// campReal.types.ts's header comment for why the two coexist.

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
  updateCamp,
  moveCampStage,
  allocateFo,
}
