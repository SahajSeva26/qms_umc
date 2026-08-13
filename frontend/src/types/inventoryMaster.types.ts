// Real backend-wired Inventory Master types — matches
// backend/src/modules/inventory/inventory-master exactly. Deliberately
// separate from features/inventory/inventory.types.ts, which is the older,
// much richer mock-data type used by the other 17 (still-mock) Inventory &
// Devices tabs — the two are unrelated models, not a renamed version of the
// same thing, so they must never be merged or cross-imported.

export type InventoryMasterType = 'device' | 'consumable' | 'accessory' | 'other'

export const INVENTORY_MASTER_TYPES: InventoryMasterType[] = ['device', 'consumable', 'accessory', 'other']

export const INVENTORY_MASTER_TYPE_LABEL: Record<InventoryMasterType, string> = {
  device: 'Device',
  consumable: 'Consumable',
  accessory: 'Accessory',
  other: 'Other',
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
