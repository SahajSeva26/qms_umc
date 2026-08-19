import api from '@/lib/api/api'
import type { PaginatedResponse } from '@/types/common.types'
import type { InventoryAssignmentEntity, SearchInventoryAssignmentQuery } from '@/types/inventoryAssignment.types'

const searchInventoryAssignments = async (query: SearchInventoryAssignmentQuery) => {
  const res = await api.get<PaginatedResponse<InventoryAssignmentEntity>>('/inventory-assignments', { params: query })
  return res.data
}

export const inventoryAssignmentService = {
  searchInventoryAssignments,
}
