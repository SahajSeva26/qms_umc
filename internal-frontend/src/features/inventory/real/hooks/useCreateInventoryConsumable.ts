import { useCreateEntity } from '@/hooks/useCreateEntity'
import { inventoryConsumableService } from '@/features/inventory/real/inventoryConsumable.service'
import { inventoryConsumableKeys } from '@/features/inventory/real/hooks/useInventoryConsumables'
import type { CreateInventoryConsumablePayload } from '@/types/inventoryConsumable.types'

export const useCreateInventoryConsumable = () =>
  useCreateEntity(
    (payload: CreateInventoryConsumablePayload) => inventoryConsumableService.createInventoryConsumable(payload),
    inventoryConsumableKeys.all,
  )
