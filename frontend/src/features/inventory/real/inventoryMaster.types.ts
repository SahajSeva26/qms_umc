// Matches backend/inventory-master exactly — deliberately separate from the
// older, richer mock-data type in inventory.types.ts. The two are unrelated models; never merge or cross-import them.

// 'accessory'/'other' are dead, commented-out backend constants — offering
// them here let the type filter send a value the backend 400s on, stalling the list.
export type InventoryMasterType = 'device' | 'consumable'

export const INVENTORY_MASTER_TYPES: InventoryMasterType[] = ['device', 'consumable']

export const INVENTORY_MASTER_TYPE_LABEL: Record<InventoryMasterType, string> = {
  device: 'Device',
  consumable: 'Consumable',
}

export type InventoryMasterStatus = 'active' | 'inactive'

export interface InventoryMasterEntity {
  id: string
  code: string
  name: string
  description: string
  type: InventoryMasterType
  sku: string
  unit: string
  minStock: number
  maxStock: number
  createdAt: string
  updatedAt: string
  // Key is ABSENT (not null/undefined-but-present) unless the caller holds
  // `inventory-master:manage` — inventory-master.mapper.ts only sets this
  // field conditionally, so a plain-read caller gets no `status` key at all.
  status?: InventoryMasterStatus
}

export interface SearchInventoryMasterQuery {
  code?: string
  name?: string
  sku?: string
  type?: InventoryMasterType
  status?: InventoryMasterStatus
  page?: string
  limit?: string
}

export interface CreateInventoryMasterPayload {
  code: string
  name: string
  description: string
  sku: string
  unit: string
  type?: InventoryMasterType
  status?: InventoryMasterStatus
  minStock?: number
  maxStock?: number
}

export interface UpdateInventoryMasterPayload {
  // `code` is intentionally absent — inventory-master.service.ts's set()
  // never reads it from the update payload, so the natural key is immutable
  // post-create even if a caller sent it.
  name?: string
  description?: string
  sku?: string
  unit?: string
  type?: InventoryMasterType
  status?: InventoryMasterStatus
  minStock?: number
  maxStock?: number
}
