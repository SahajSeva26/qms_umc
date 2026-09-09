import api from '@/lib/api/api'
import type { ApiResponse, PaginatedResponse } from '@/types/common.types'
import type {
  CreateVendorMasterPayload,
  SearchVendorMasterQuery,
  UpdateVendorMasterPayload,
  VendorMasterEntity,
} from '@/types/vendorMaster.types'

const searchVendorMasters = async (query: SearchVendorMasterQuery) => {
  const res = await api.get<PaginatedResponse<VendorMasterEntity>>('/vendor-masters', { params: query })
  return res.data
}

const getVendorMaster = async (id: string) => {
  const res = await api.get<ApiResponse<VendorMasterEntity>>(`/vendor-masters/${id}`)
  return res.data
}

const createVendorMaster = async (payload: CreateVendorMasterPayload) => {
  const res = await api.post<ApiResponse<VendorMasterEntity>>('/vendor-masters', payload)
  return res.data
}

const updateVendorMaster = async (id: string, payload: UpdateVendorMasterPayload) => {
  const res = await api.put<ApiResponse<VendorMasterEntity>>(`/vendor-masters/${id}`, payload)
  return res.data
}

export const vendorMasterService = {
  searchVendorMasters,
  getVendorMaster,
  createVendorMaster,
  updateVendorMaster,
}
