import { useUpdateEntity } from '@/hooks/useUpdateEntity'
import { inventoryMasterService } from '@/features/inventory/real/inventoryMaster.service'
import { inventoryMasterKeys } from '@/features/inventory/real/hooks/useInventoryMasters'
import { inventoryDeviceKeys } from '@/features/inventory/real/hooks/useInventoryDevices'
import { inventoryConsumableKeys } from '@/features/inventory/real/hooks/useInventoryConsumables'
import type { UpdateInventoryMasterPayload } from '@/features/inventory/real/inventoryMaster.types'

// No singular ['inventory-master', id] key exists — only the list.
// Devices/Consumables cache their own item.name snapshot, so a rename needs both invalidated too; Assignments/Ledger never show it.
export const useUpdateInventoryMaster = (id: string) =>
  useUpdateEntity(
    (payload: UpdateInventoryMasterPayload) => inventoryMasterService.updateInventoryMaster(id, payload),
    [inventoryMasterKeys.all, inventoryDeviceKeys.all, inventoryConsumableKeys.all],
  )
