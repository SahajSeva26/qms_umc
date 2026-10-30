import { useUpdateEntity } from '@/hooks/useUpdateEntity'
import { inventoryDeviceService } from '@/features/inventory/real/inventoryDevice.service'
import { inventoryDeviceKeys } from '@/features/inventory/real/hooks/useInventoryDevices'
import type { UpdateInventoryDevicePayload } from '@/types/inventoryDevice.types'

export const useUpdateInventoryDevice = (id: string) =>
  useUpdateEntity((payload: UpdateInventoryDevicePayload) => inventoryDeviceService.updateInventoryDevice(id, payload), [inventoryDeviceKeys.all])
