import { useEntityQuery } from '@/hooks/useEntityQuery'
import { createEntityKeys } from '@/hooks/entityQueryKeys'
import { inventoryMasterService } from '@/features/inventory/real/inventoryMaster.service'
import type { SearchInventoryMasterQuery } from '@/types/inventoryMaster.types'

// No singular 'inventory-master' entry — this entity has no single-get
// hook/query, only the list.
export const inventoryMasterKeys = createEntityKeys<SearchInventoryMasterQuery>('inventory-masters')

// Reads are open to any authenticated user on the backend — no permission
// gate needed here, only on the write hooks.
export const useInventoryMasters = (query: SearchInventoryMasterQuery) =>
  useEntityQuery(inventoryMasterKeys, (q) => inventoryMasterService.searchInventoryMasters(q), query)
