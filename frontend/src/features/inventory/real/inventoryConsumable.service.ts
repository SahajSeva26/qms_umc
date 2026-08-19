import api from '@/lib/api/api'
import type { ApiResponse, PaginatedResponse } from '@/types/common.types'
import type {
  CreateInventoryConsumablePayload,
  InventoryConsumableEntity,
  SearchInventoryConsumableQuery,
  UpdateInventoryConsumablePayload,
} from '@/types/inventoryConsumable.types'

const searchInventoryConsumables = async (query: SearchInventoryConsumableQuery) => {
  const res = await api.get<PaginatedResponse<InventoryConsumableEntity>>('/inventory-consumables', { params: query })
  return res.data
}

const getInventoryConsumable = async (id: string) => {
  const res = await api.get<ApiResponse<InventoryConsumableEntity>>(`/inventory-consumables/${id}`)
  return res.data
}

const createInventoryConsumable = async (payload: CreateInventoryConsumablePayload) => {
  const res = await api.post<ApiResponse<InventoryConsumableEntity>>('/inventory-consumables', payload)
  return res.data
}

const updateInventoryConsumable = async (id: string, payload: UpdateInventoryConsumablePayload) => {
  const res = await api.put<ApiResponse<InventoryConsumableEntity>>(`/inventory-consumables/${id}`, payload)
  return res.data
}

export const inventoryConsumableService = {
  searchInventoryConsumables,
  getInventoryConsumable,
  createInventoryConsumable,
  updateInventoryConsumable,
}
