import { useCreateEntity } from '@/hooks/useCreateEntity'
import { inventoryDeviceService } from '@/features/inventory/real/inventoryDevice.service'
import { inventoryDeviceKeys } from '@/features/inventory/real/hooks/useInventoryDevices'
import type { CreateInventoryDevicePayload } from '@/types/inventoryDevice.types'

export const useCreateInventoryDevice = () =>
  useCreateEntity((payload: CreateInventoryDevicePayload) => inventoryDeviceService.createInventoryDevice(payload), inventoryDeviceKeys.all)
