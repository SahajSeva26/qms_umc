import { useEntityQuery } from '@/hooks/useEntityQuery'
import { createEntityKeys } from '@/hooks/entityQueryKeys'
import { inventoryConsumableService } from '@/features/inventory/real/inventoryConsumable.service'
import type { SearchInventoryConsumableQuery } from '@/types/inventoryConsumable.types'

export const inventoryConsumableKeys = createEntityKeys<SearchInventoryConsumableQuery>('inventory-consumables')

// Reads are open to any authenticated user — `enabled` is only for a caller already gating its own render elsewhere.
export const useInventoryConsumables = (query: SearchInventoryConsumableQuery, enabled = true) =>
  useEntityQuery(inventoryConsumableKeys, (q) => inventoryConsumableService.searchInventoryConsumables(q), query, { enabled })
