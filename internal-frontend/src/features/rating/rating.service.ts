import api from '@/lib/api/api'
import type { ApiResponse, PaginatedResponse } from '@/types/common.types'
import type {
  CreateRatingPayload,
  RatingEntity,
  SearchRatingQuery,
  UpdateRatingPayload,
} from '@/types/rating.types'

const searchRatings = async (query: SearchRatingQuery) => {
  const res = await api.get<PaginatedResponse<RatingEntity>>('/ratings', { params: query })
  return res.data
}

// The caller's own ratings — about them as worker OR given by them as rater. Always pinned
// server-side to the acting role regardless of permission/role type.
const myRatings = async (query: SearchRatingQuery) => {
  const res = await api.get<PaginatedResponse<RatingEntity>>('/ratings/me', { params: query })
  return res.data
}

const getRating = async (id: string) => {
  const res = await api.get<ApiResponse<RatingEntity>>(`/ratings/${id}`)
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
  myRatings,
  getRating,
  createRating,
  updateRating,
}
