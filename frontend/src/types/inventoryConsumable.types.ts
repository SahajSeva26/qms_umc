// Real backend-wired Inventory Consumable types — matches
// backend/src/modules/inventory/inventory-consumable exactly. A consumable
// is a physical stock LOT (unique per item+batch) of an InventoryMaster
// catalog item — separate from features/inventory/inventory.types.ts, which
// is the older, mock-data consumable model the still-mock tabs use.

export type InventoryConsumableStatus = 'active' | 'expired'

export interface InventoryConsumableItemRef {
  id: string
  code?: string
  name?: string
  sku?: string
  unit?: string
}

export interface InventoryConsumableEntity {
  id: string
  item: InventoryConsumableItemRef
  batch: string
  manufacturingDate: string
  expiryDate: string
  quantity: number
  createdAt: string
  updatedAt: string
  // Key is ABSENT (not null/undefined-but-present) unless the caller holds
  // inventory-consumable:manage — the mapper only sets this field
  // conditionally, and search itself defaults to active-only for everyone else.
  status?: InventoryConsumableStatus
}

export interface SearchInventoryConsumableQuery {
  item?: string
  batch?: string
  status?: InventoryConsumableStatus
  page?: string
  limit?: string
}

export interface CreateInventoryConsumablePayload {
  item: string
  batch: string
  manufacturingDate: string
  expiryDate: string
  quantity?: number
}

export interface UpdateInventoryConsumablePayload {
  // item intentionally absent — immutable post-create.
  batch?: string
  manufacturingDate?: string
  expiryDate?: string
  quantity?: number
  status?: InventoryConsumableStatus
}
