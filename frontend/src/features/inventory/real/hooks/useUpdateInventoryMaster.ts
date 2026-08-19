import { useUpdateEntity } from '@/hooks/useUpdateEntity'
import { inventoryMasterService } from '@/features/inventory/real/inventoryMaster.service'
import { inventoryMasterKeys } from '@/features/inventory/real/hooks/useInventoryMasters'
import type { UpdateInventoryMasterPayload } from '@/types/inventoryMaster.types'

// No singular ['inventory-master', id] key exists — only the list.
export const useUpdateInventoryMaster = (id: string) =>
  useUpdateEntity((payload: UpdateInventoryMasterPayload) => inventoryMasterService.updateInventoryMaster(id, payload), [inventoryMasterKeys.all])
