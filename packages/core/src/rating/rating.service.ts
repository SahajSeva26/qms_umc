import type { AxiosInstance } from 'axios'
import type { ApiResponse, PaginatedResponse } from '../common.types'
import type { CreateRatingPayload, RatingEntity, SearchRatingQuery, UpdateRatingPayload } from './rating.types'

// Takes the CALLING app's own configured axios instance, same convention as getMe(api) and the
// notifications service — this package stays independent of either app's API client config.
export async function searchRatings(api: AxiosInstance, query: SearchRatingQuery) {
  const res = await api.get<PaginatedResponse<RatingEntity>>('/ratings', { params: query })
  return res.data
}

// The caller's own ratings — about them as worker OR given by them as rater. Always pinned
// server-side to the acting role regardless of permission/role type.
export async function myRatings(api: AxiosInstance, query: SearchRatingQuery) {
  const res = await api.get<PaginatedResponse<RatingEntity>>('/ratings/me', { params: query })
  return res.data
}

export async function getRating(api: AxiosInstance, id: string) {
  const res = await api.get<ApiResponse<RatingEntity>>(`/ratings/${id}`)
  return res.data
}

export async function createRating(api: AxiosInstance, payload: CreateRatingPayload) {
  const res = await api.post<ApiResponse<RatingEntity>>('/ratings', payload)
  return res.data
}

export async function updateRating(api: AxiosInstance, id: string, payload: UpdateRatingPayload) {
  const res = await api.put<ApiResponse<RatingEntity>>(`/ratings/${id}`, payload)
  return res.data
}
