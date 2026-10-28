import api from '@/lib/api/api'
import type { ApiResponse } from '@qms/core'
import type {
  BookCampPayload,
  BookingAvailabilityPayload,
  BookingAvailabilityResponse,
  CampEntity,
  CampMutationResponseEntity,
  CampSummary,
  SearchCampQuery,
} from '@/types/campReal.types'

export interface MyCampsResponse {
  success: boolean
  message: string
  data: { count: number; items: CampEntity[]; summary: CampSummary }
}

// GET /camps/my — field-force's own camps (FO/dietitian/MR), scoped server-side to the
// caller's own slot. Carries a top-level `summary` (status/type counts) beyond the page itself.
const myCamps = async (query: SearchCampQuery) => {
  const res = await api.get<MyCampsResponse>('/camps/my', { params: query })
  return res.data
}

// GET /camps/:id — reads are tenant-scoped but open to any authenticated user server-side; the
// Camp Dossier uses this for a single camp regardless of how the caller reached it (drawer or
// a direct standalone-page link). searchScopedCamps is left out — no tab needs it yet.
const getCamp = async (id: string) => {
  const res = await api.get<ApiResponse<CampEntity>>(`/camps/${id}`)
  return res.data
}

// Pharma field-force booking path — POST /camps/book, not /camps.
const bookCamp = async (payload: BookCampPayload) => {
  const res = await api.post<ApiResponse<CampMutationResponseEntity>>('/camps/book', payload)
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

export const pharmaCampsService = {
  myCamps,
  getCamp,
  bookCamp,
  getBookingAvailability,
}
