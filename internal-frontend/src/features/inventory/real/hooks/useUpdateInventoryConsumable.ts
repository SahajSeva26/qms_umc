import { useUpdateEntity } from '@/hooks/useUpdateEntity'
import { inventoryConsumableService } from '@/features/inventory/real/inventoryConsumable.service'
import { inventoryConsumableKeys } from '@/features/inventory/real/hooks/useInventoryConsumables'
import type { UpdateInventoryConsumablePayload } from '@/types/inventoryConsumable.types'

export const useUpdateInventoryConsumable = (id: string) =>
  useUpdateEntity(
    (payload: UpdateInventoryConsumablePayload) => inventoryConsumableService.updateInventoryConsumable(id, payload),
    [inventoryConsumableKeys.all],
  )
