import { useQuery } from '@tanstack/react-query'
import { inventoryMasterService } from '@/features/inventory/inventoryMaster.service'
import type { SearchInventoryMasterQuery } from '@/types/inventoryMaster.types'

// Thin useQuery wrapper, same pattern as useDivisions/useRoles. Reads are
// open to any authenticated user on the backend (inventory-master.routes.ts)
// — no permission gate needed here, only on the write hooks below.
export const useInventoryMasters = (query: SearchInventoryMasterQuery) => {
  return useQuery({
    queryKey: ['inventory-masters', query],
    queryFn: () => inventoryMasterService.searchInventoryMasters(query),
  })
}
