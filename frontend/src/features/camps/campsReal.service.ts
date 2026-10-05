import api from '@/lib/api/api'
import type { ApiResponse, PaginatedResponse } from '@/types/common.types'
import type {
  BookCampPayload,
  BookingAvailabilityPayload,
  BookingAvailabilityResponse,
  CampEntity,
  CampMutationResponseEntity,
  CampStatus,
  CreateCampPayload,
  MoveCampStagePayload,
  SearchCampQuery,
  UpdateCampPayload,
} from '@/types/campReal.types'
import type { CampReport } from '@/types/campReport.types'

// Deliberately separate from `camps.service.ts`, the old mock store other files still depend on.
const searchCamps = async (query: SearchCampQuery) => {
  const res = await api.get<PaginatedResponse<CampEntity>>('/camps', { params: query })
  return res.data
}

const getCamp = async (id: string) => {
  const res = await api.get<ApiResponse<CampEntity>>(`/camps/${id}`)
  return res.data
}

// Mutations return the unpopulated in-memory document — fetch/refetch the camp for populated fields.
const createCamp = async (payload: CreateCampPayload) => {
  const res = await api.post<ApiResponse<CampMutationResponseEntity>>('/camps', payload)
  return res.data
}

// Pharma field-force booking path — POST /camps/book, not /camps.
const bookCamp = async (payload: BookCampPayload) => {
  const res = await api.post<ApiResponse<CampMutationResponseEntity>>('/camps/book', payload)
  return res.data
}

const updateCamp = async (id: string, payload: UpdateCampPayload) => {
  const res = await api.put<ApiResponse<CampMutationResponseEntity>>(`/camps/${id}`, payload)
  return res.data
}

const moveCampStage = async (id: string, payload: MoveCampStagePayload) => {
  const res = await api.patch<ApiResponse<CampMutationResponseEntity>>(`/camps/${id}/stage`, payload)
  return res.data
}

const allocateFo = async (id: string) => {
  const res = await api.post<ApiResponse<CampMutationResponseEntity>>(`/camps/${id}/allocate`)
  return res.data
}

// Optional `status` scopes the whole report (incl. byType) to one status tab.
const getCampReport = async (status?: CampStatus) => {
  const res = await api.get<ApiResponse<CampReport>>('/camps/report', { params: status ? { status } : undefined })
  return res.data
}

// Backend requires the payload key spelled `projectID` — translated here only.
const getBookingAvailability = async (payload: BookingAvailabilityPayload) => {
  const { projectId, type, ...rest } = payload
  const res = await api.post<ApiResponse<BookingAvailabilityResponse>>('/camps/booking-availability', {
    projectID: projectId,
    ...(type ? { type } : {}),
    ...rest,
  })
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
  getCampReport,
  getBookingAvailability,
}
