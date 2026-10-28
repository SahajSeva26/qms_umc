import api from '@/lib/api/api'
import type { ApiResponse, PaginatedResponse } from '@qms/core'
import type {
  CreateRatingPayload,
  RatingEntity,
  SearchRatingQuery,
  UpdateRatingPayload,
} from '@/types/rating.types'

// Mirrors internal-frontend's rating.service.ts.
const searchRatings = async (query: SearchRatingQuery) => {
  const res = await api.get<PaginatedResponse<RatingEntity>>('/ratings', { params: query })
  return res.data
}

const createRating = async (payload: CreateRatingPayload) => {
  const res = await api.post<ApiResponse<RatingEntity>>('/ratings', payload)
  return res.data
}

const updateRating = async (id: string, payload: UpdateRatingPayload) => {
  const res = await api.put<ApiResponse<RatingEntity>>(`/ratings/${id}`, payload)
  return res.data
}

export const ratingService = {
  searchRatings,
  createRating,
  updateRating,
}
