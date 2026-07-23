import api from '@/lib/api/api'
import type { ApiResponse, PaginatedResponse } from '@/types/common.types'
import type {
  CreateGeoProfilePayload,
  GeoProfileEntity,
  NearestGeoProfileQuery,
  SearchGeoProfileQuery,
  UpdateGeoProfilePayload,
} from '@/types/geoProfile.types'

const searchGeoProfiles = async (query: SearchGeoProfileQuery) => {
  const res = await api.get<PaginatedResponse<GeoProfileEntity>>('/geo-profiles', { params: query })
  return res.data
}

const getGeoProfile = async (id: string) => {
  const res = await api.get<ApiResponse<GeoProfileEntity>>(`/geo-profiles/${id}`)
  return res.data
}

const nearestGeoProfiles = async (query: NearestGeoProfileQuery) => {
  const res = await api.get<PaginatedResponse<GeoProfileEntity>>('/geo-profiles/nearest', { params: query })
  return res.data
}

const createGeoProfile = async (payload: CreateGeoProfilePayload) => {
  const res = await api.post<ApiResponse<GeoProfileEntity>>('/geo-profiles', payload)
  return res.data
}

const updateGeoProfile = async (id: string, payload: UpdateGeoProfilePayload) => {
  const res = await api.put<ApiResponse<GeoProfileEntity>>(`/geo-profiles/${id}`, payload)
  return res.data
}

export const geoProfileService = {
  searchGeoProfiles,
  getGeoProfile,
  nearestGeoProfiles,
  createGeoProfile,
  updateGeoProfile,
}
