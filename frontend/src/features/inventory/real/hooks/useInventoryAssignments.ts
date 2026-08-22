import { useEntityQuery } from '@/hooks/useEntityQuery'
import { createEntityKeys } from '@/hooks/entityQueryKeys'
import { inventoryAssignmentService } from '@/features/inventory/real/inventoryAssignment.service'
import type { SearchInventoryAssignmentQuery } from '@/features/inventory/real/inventoryAssignment.types'

export const inventoryAssignmentKeys = createEntityKeys<SearchInventoryAssignmentQuery>('inventory-assignments')

// Reads are open to any authenticated user on the backend — no permission
// gate needed here, only on the write hooks.
export const useInventoryAssignments = (query: SearchInventoryAssignmentQuery, enabled = true) =>
  useEntityQuery(inventoryAssignmentKeys, (q) => inventoryAssignmentService.searchInventoryAssignments(q), query, { enabled })
