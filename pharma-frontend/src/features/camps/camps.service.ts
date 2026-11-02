import api from '@/lib/api/api'
import type { ApiResponse, PaginatedResponse } from '@qms/core'
import type {
  BookCampPayload,
  BookingAvailabilityPayload,
  BookingAvailabilityResponse,
  CampEntity,
  CampFile,
  CampMutationResponseEntity,
  CampSummary,
  GetCampFilesQuery,
  SearchCampQuery,
} from '@/types/campReal.types'

export interface MyCampsResponse {
  success: boolean
  message: string
  data: { count: number; items: CampEntity[]; summary: CampSummary }
}

// GET /camps/my — own-scoped camps per role (field-force: own slot; HO: division; ASM/RSM:
// downline), with a top-level `summary` (status/type counts) beyond the page itself.
const myCamps = async (query: SearchCampQuery) => {
  const res = await api.get<MyCampsResponse>('/camps/my', { params: query })
  return res.data
}

// GET /camps/:id — reads are tenant-scoped but open to any authenticated user server-side; the
// Camp Dossier uses this for a single camp regardless of how the caller reached it (drawer or
// a direct standalone-page link).
const getCamp = async (id: string) => {
  const res = await api.get<ApiResponse<CampEntity>>(`/camps/${id}`)
  return res.data
}

// GET /camps — generic role-scoped search, now used only by CampManagementPage's real filterable
// list. HO/RSM/ASM's dashboard/schedule tabs moved to /camps/my (see myCamps) once it opened to them.
const searchScopedCamps = async (query: SearchCampQuery) => {
  const res = await api.get<PaginatedResponse<CampEntity>>('/camps', { params: query })
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

// GET /camps/files — read-only here (upload/activate/discard are FO/dietitian-only server-side).
// Authorization is "can the caller read this camp" — an MR's camp:book permission already qualifies.
const getCampFiles = async (query: GetCampFilesQuery) => {
  const res = await api.get<PaginatedResponse<CampFile>>('/camps/files', { params: query })
  return res.data
}

export const pharmaCampsService = {
  myCamps,
  getCamp,
  bookCamp,
  getBookingAvailability,
  searchScopedCamps,
  getCampFiles,
}
