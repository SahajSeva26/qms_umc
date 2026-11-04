import api from '@/lib/api/api'
import type { ApiResponse, PaginatedResponse } from '@/types/common.types'
import type { BrandEntity, CreateBrandPayload, SearchBrandQuery, UpdateBrandPayload } from '@/types/brand.types'

const searchBrands = async (query: SearchBrandQuery) => {
  const res = await api.get<PaginatedResponse<BrandEntity>>('/brands', { params: query })
  return res.data
}

const getBrand = async (id: string) => {
  const res = await api.get<ApiResponse<BrandEntity>>(`/brands/${id}`)
  return res.data
}

const createBrand = async (payload: CreateBrandPayload) => {
  const res = await api.post<ApiResponse<BrandEntity>>('/brands', payload)
  return res.data
}

const updateBrand = async (id: string, payload: UpdateBrandPayload) => {
  const res = await api.put<ApiResponse<BrandEntity>>(`/brands/${id}`, payload)
  return res.data
}

export const brandService = {
  searchBrands,
  getBrand,
  createBrand,
  updateBrand,
}
