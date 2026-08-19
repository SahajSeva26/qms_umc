import api from '@/lib/api/api'
import type { ApiResponse, PaginatedResponse } from '@/types/common.types'
import type {
  CreateInventoryRequestPayload,
  InventoryRequestEntity,
  MoveInventoryRequestStagePayload,
  SearchInventoryRequestQuery,
  UpdateInventoryRequestPayload,
} from '@/types/inventoryRequest.types'

const searchInventoryRequests = async (query: SearchInventoryRequestQuery) => {
  const res = await api.get<PaginatedResponse<InventoryRequestEntity>>('/inventory-requests', { params: query })
  return res.data
}

const getInventoryRequest = async (id: string) => {
  const res = await api.get<ApiResponse<InventoryRequestEntity>>(`/inventory-requests/${id}`)
  return res.data
}

const createInventoryRequest = async (payload: CreateInventoryRequestPayload) => {
  const res = await api.post<ApiResponse<InventoryRequestEntity>>('/inventory-requests', payload)
  return res.data
}

const updateInventoryRequest = async (id: string, payload: UpdateInventoryRequestPayload) => {
  const res = await api.put<ApiResponse<InventoryRequestEntity>>(`/inventory-requests/${id}`, payload)
  return res.data
}

const moveInventoryRequestStage = async (id: string, payload: MoveInventoryRequestStagePayload) => {
  const res = await api.patch<ApiResponse<InventoryRequestEntity>>(`/inventory-requests/${id}/stage`, payload)
  return res.data
}

export const inventoryRequestService = {
  searchInventoryRequests,
  getInventoryRequest,
  createInventoryRequest,
  updateInventoryRequest,
  moveInventoryRequestStage,
}
