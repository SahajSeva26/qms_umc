import api from '@/lib/api/api'
import type { ApiResponse, PaginatedResponse } from '@/types/common.types'
import type {
  DirectAssignmentPayload,
  InventoryAssignmentEntity,
  InventoryAssignmentReportResponse,
  SearchInventoryAssignmentQuery,
} from '@/types/inventoryAssignment.types'

const searchInventoryAssignments = async (query: SearchInventoryAssignmentQuery) => {
  const res = await api.get<PaginatedResponse<InventoryAssignmentEntity>>('/inventory-assignments', { params: query })
  return res.data
}

const getInventoryAssignmentReport = async () => {
  const res = await api.get<ApiResponse<InventoryAssignmentReportResponse>>('/inventory-assignments/report')
  return res.data
}

const directAssign = async (fo: string, payload: DirectAssignmentPayload) => {
  const res = await api.post<PaginatedResponse<InventoryAssignmentEntity>>(
    `/inventory-assignments/direct-assignment/${fo}`, payload,
  )
  return res.data
}

export const inventoryAssignmentService = {
  searchInventoryAssignments,
  getInventoryAssignmentReport,
  directAssign,
}
