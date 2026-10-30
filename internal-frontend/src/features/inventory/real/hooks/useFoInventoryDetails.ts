import { useQuery } from '@tanstack/react-query'
import { inventoryDeviceService } from '@/features/inventory/real/inventoryDevice.service'
import { inventoryConsumableService } from '@/features/inventory/real/inventoryConsumable.service'
import type { InventoryDeviceEntity } from '@/types/inventoryDevice.types'
import type { InventoryConsumableEntity } from '@/types/inventoryConsumable.types'

// Fetched by exact id, not a global list scan — never misses an item regardless of status
// (the global search defaults to active-only, which would hide expired consumable lots).
export const useFoInventoryDevices = (ids: string[], enabled: boolean) =>
  useQuery({
    queryKey: ['fo-inventory-drawer-devices', ids],
    queryFn: async () => {
      const results = await Promise.all(ids.map((id) => inventoryDeviceService.getInventoryDevice(id)))
      const map = new Map<string, InventoryDeviceEntity>()
      results.forEach((res, i) => {
        if (!res.data) throw new Error(`Device ${ids[i]} was not returned by the server`)
        map.set(res.data.id, res.data)
      })
      return map
    },
    enabled: enabled && ids.length > 0,
  })

export const useFoInventoryConsumables = (ids: string[], enabled: boolean) =>
  useQuery({
    queryKey: ['fo-inventory-drawer-consumables', ids],
    queryFn: async () => {
      const results = await Promise.all(ids.map((id) => inventoryConsumableService.getInventoryConsumable(id)))
      const map = new Map<string, InventoryConsumableEntity>()
      results.forEach((res, i) => {
        if (!res.data) throw new Error(`Consumable ${ids[i]} was not returned by the server`)
        map.set(res.data.id, res.data)
      })
      return map
    },
    enabled: enabled && ids.length > 0,
  })
