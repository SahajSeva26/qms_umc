import { FiCpu, FiDroplet } from 'react-icons/fi'
import type { InventoryMasterType } from '@/types/inventoryMaster.types'

export const INVENTORY_MASTER_TYPE_META: Record<InventoryMasterType, { color: string; icon: typeof FiCpu }> = {
  device: { color: '#3b6dff', icon: FiCpu },
  consumable: { color: '#14b8a6', icon: FiDroplet },
}
