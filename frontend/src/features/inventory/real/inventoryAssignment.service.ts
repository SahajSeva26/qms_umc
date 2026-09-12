import api from '@/lib/api/api'
import type { ApiResponse, PaginatedResponse } from '@/types/common.types'
import type {
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

export const inventoryAssignmentService = {
  searchInventoryAssignments,
  getInventoryAssignmentReport,
}
