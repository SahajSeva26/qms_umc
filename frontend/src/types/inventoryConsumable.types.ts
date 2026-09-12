// Real backend-wired Inventory Consumable types — matches
// backend/src/modules/inventory/inventory-consumable exactly. A consumable
// is a physical stock LOT (unique per item+batch) of an InventoryMaster
// catalog item — separate from features/inventory/inventory.types.ts, which
// is the older, mock-data consumable model the still-mock tabs use.

export type InventoryConsumableStatus = 'active' | 'expired'

export const INVENTORY_CONSUMABLE_STATUS_LABEL: Record<InventoryConsumableStatus, string> = {
  active: 'Active',
  expired: 'Expired',
}

// GET /inventory-consumables/report — organisation-wide, no query params,
// gated on inventory-consumable:manage. summary.warehouseConsumableQuantity
// and consumables.warehouseQuantity are the same value surfaced twice by the backend's own mapper.
export interface InventoryConsumableReportResponse {
  summary: { consumableLots: number; warehouseConsumableQuantity: number }
  consumables: {
    warehouseQuantity: number
    expiredByDate: number
    byStatus: { status: InventoryConsumableStatus; count: number }[]
  }
}

export interface InventoryConsumableItemRef {
  id: string
  code?: string
  name?: string
  sku?: string
  unit?: string
}

// vendor is populated to {id, code, name} when hydrated, {id} only when not
// (same mapVendor() shape inventory-device.mapper.ts uses). null on any
// consumable created before `vendor` became a required field — the backend
// only enforces required-ness on save, not retroactively on existing documents.
export interface InventoryConsumableVendorRef {
  id: string
  code?: string
  name?: string
}

export interface InventoryConsumableEntity {
  id: string
  item: InventoryConsumableItemRef
  vendor: InventoryConsumableVendorRef | null
  batch: string
  manufacturingDate: string
  // Absent (not sent at all) when the lot has no expiry — the mapper returns
  // it verbatim with no `?? null` fallback.
  expiryDate?: string
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
  vendor: string
  batch: string
  manufacturingDate: string
  expiryDate?: string
  quantity?: number
}

export interface UpdateInventoryConsumablePayload {
  // item/vendor intentionally absent — immutable post-create.
  batch?: string
  manufacturingDate?: string
  expiryDate?: string
  quantity?: number
  status?: InventoryConsumableStatus
}
