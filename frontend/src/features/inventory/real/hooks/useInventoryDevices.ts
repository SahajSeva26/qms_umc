import { useEntityQuery } from '@/hooks/useEntityQuery'
import { createEntityKeys } from '@/hooks/entityQueryKeys'
import { inventoryDeviceService } from '@/features/inventory/real/inventoryDevice.service'
import type { SearchInventoryDeviceQuery } from '@/types/inventoryDevice.types'

export const inventoryDeviceKeys = createEntityKeys<SearchInventoryDeviceQuery>('inventory-devices')

// Reads are open to any authenticated user on the backend — no permission
// gate needed here, only on the write hooks.
export const useInventoryDevices = (query: SearchInventoryDeviceQuery) =>
  useEntityQuery(inventoryDeviceKeys, (q) => inventoryDeviceService.searchInventoryDevices(q), query)
