import api from '@/lib/api/api'
import type { ApiResponse, PaginatedResponse } from '@/types/common.types'
import type {
  CreateInventoryMasterPayload,
  InventoryMasterEntity,
  SearchInventoryMasterQuery,
  UpdateInventoryMasterPayload,
} from '@/features/inventory/real/inventoryMaster.types'

const searchInventoryMasters = async (query: SearchInventoryMasterQuery) => {
  const res = await api.get<PaginatedResponse<InventoryMasterEntity>>('/inventory-masters', { params: query })
  return res.data
}

const getInventoryMaster = async (id: string) => {
  const res = await api.get<ApiResponse<InventoryMasterEntity>>(`/inventory-masters/${id}`)
  return res.data
}

const createInventoryMaster = async (payload: CreateInventoryMasterPayload) => {
  const res = await api.post<ApiResponse<InventoryMasterEntity>>('/inventory-masters', payload)
  return res.data
}

const updateInventoryMaster = async (id: string, payload: UpdateInventoryMasterPayload) => {
  const res = await api.put<ApiResponse<InventoryMasterEntity>>(`/inventory-masters/${id}`, payload)
  return res.data
}

export const inventoryMasterService = {
  searchInventoryMasters,
  getInventoryMaster,
  createInventoryMaster,
  updateInventoryMaster,
}
