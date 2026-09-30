import { useEntityQuery } from '@/hooks/useEntityQuery'
import { createEntityKeys } from '@/hooks/entityQueryKeys'
import { inventoryDeviceService } from '@/features/inventory/real/inventoryDevice.service'
import type { SearchInventoryDeviceQuery } from '@/types/inventoryDevice.types'

export const inventoryDeviceKeys = createEntityKeys<SearchInventoryDeviceQuery>('inventory-devices')

// Reads are open to any authenticated user — `enabled` is only for a caller already gating its own render elsewhere.
export const useInventoryDevices = (query: SearchInventoryDeviceQuery, enabled = true) =>
  useEntityQuery(inventoryDeviceKeys, (q) => inventoryDeviceService.searchInventoryDevices(q), query, { enabled })
