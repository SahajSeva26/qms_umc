import { useCreateEntity } from '@/hooks/useCreateEntity'
import { inventoryMasterService } from '@/features/inventory/real/inventoryMaster.service'
import { inventoryMasterKeys } from '@/features/inventory/real/hooks/useInventoryMasters'
import type { CreateInventoryMasterPayload } from '@/types/inventoryMaster.types'

export const useCreateInventoryMaster = () =>
  useCreateEntity((payload: CreateInventoryMasterPayload) => inventoryMasterService.createInventoryMaster(payload), inventoryMasterKeys.all)
