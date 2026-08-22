import api from '@/lib/api/api'
import type { ApiResponse, PaginatedResponse } from '@/types/common.types'
import type {
  CreateInventoryDevicePayload,
  InventoryDeviceEntity,
  SearchInventoryDeviceQuery,
  UpdateInventoryDevicePayload,
} from '@/features/inventory/real/inventoryDevice.types'

const searchInventoryDevices = async (query: SearchInventoryDeviceQuery) => {
  const res = await api.get<PaginatedResponse<InventoryDeviceEntity>>('/inventory-devices', { params: query })
  return res.data
}

const getInventoryDevice = async (id: string) => {
  const res = await api.get<ApiResponse<InventoryDeviceEntity>>(`/inventory-devices/${id}`)
  return res.data
}

const createInventoryDevice = async (payload: CreateInventoryDevicePayload) => {
  const res = await api.post<ApiResponse<InventoryDeviceEntity>>('/inventory-devices', payload)
  return res.data
}

const updateInventoryDevice = async (id: string, payload: UpdateInventoryDevicePayload) => {
  const res = await api.put<ApiResponse<InventoryDeviceEntity>>(`/inventory-devices/${id}`, payload)
  return res.data
}

export const inventoryDeviceService = {
  searchInventoryDevices,
  getInventoryDevice,
  createInventoryDevice,
  updateInventoryDevice,
}
