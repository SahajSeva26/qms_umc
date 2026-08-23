import { useEntityQuery } from '@/hooks/useEntityQuery'
import { createEntityKeys } from '@/hooks/entityQueryKeys'
import { inventoryConsumableService } from '@/features/inventory/real/inventoryConsumable.service'
import type { SearchInventoryConsumableQuery } from '@/features/inventory/real/inventoryConsumable.types'

export const inventoryConsumableKeys = createEntityKeys<SearchInventoryConsumableQuery>('inventory-consumables')

// Reads are open to any authenticated user on the backend (search defaults
// to active-only lots for non-managers) — no permission gate needed here,
// only on the write hooks.
export const useInventoryConsumables = (query: SearchInventoryConsumableQuery) =>
  useEntityQuery(inventoryConsumableKeys, (q) => inventoryConsumableService.searchInventoryConsumables(q), query)
