import { useCreateEntity } from '@/hooks/useCreateEntity'
import { inventoryMasterService } from '@/features/inventory/inventoryMaster.service'
import { inventoryMasterKeys } from '@/features/inventory/hooks/useInventoryMasters'
import type { CreateInventoryMasterPayload } from '@/types/inventoryMaster.types'

export const useCreateInventoryMaster = () =>
  useCreateEntity((payload: CreateInventoryMasterPayload) => inventoryMasterService.createInventoryMaster(payload), inventoryMasterKeys.all)
