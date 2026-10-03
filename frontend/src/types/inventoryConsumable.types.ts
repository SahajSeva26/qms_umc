// Matches backend/inventory-consumable exactly. A consumable is a physical
// stock LOT (unique per item+batch) of an InventoryMaster catalog item.

export type InventoryConsumableStatus = 'active' | 'expired'

export const INVENTORY_CONSUMABLE_STATUS_LABEL: Record<InventoryConsumableStatus, string> = {
  active: 'Active',
  expired: 'Expired',
}

// GET /inventory-consumables/report, gated on inventory-consumable:manage.
// summary/consumables both surface warehouseQuantity — same value, twice.
export interface InventoryConsumableExpiryBands {
  expired: number
  within30: number
  within30to90: number
  within90to180: number
  beyond180: number
  noExpiry: number
}

export interface InventoryConsumableReportResponse {
  summary: { consumableLots: number; warehouseConsumableQuantity: number }
  consumables: {
    warehouseQuantity: number
    expiredByDate: number
    // FEFO expiry-band counts, collection-wide (not per-row) — mirrors ExpiryBandPill's bands.
    expiryBands: InventoryConsumableExpiryBands
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

// Populated to {id, code, name} when hydrated, {id} only when not. Can be
// null — legacy stored records may lack the reference despite it being required now.
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
  // Key is ABSENT unless the caller holds inventory-consumable:manage — the
  // mapper only sets it conditionally; search defaults to active-only otherwise.
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
