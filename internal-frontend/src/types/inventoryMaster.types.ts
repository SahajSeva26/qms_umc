// Matches backend/inventory-master exactly.

// 'accessory'/'other' are dead, commented-out backend constants — offering
// them here let the type filter send a value the backend 400s on, stalling the list.
export type InventoryMasterType = 'device' | 'consumable'

export const INVENTORY_MASTER_TYPES: InventoryMasterType[] = ['device', 'consumable']

export const INVENTORY_MASTER_TYPE_LABEL: Record<InventoryMasterType, string> = {
  device: 'Device',
  consumable: 'Consumable',
}

export type InventoryMasterStatus = 'active' | 'inactive'

export const INVENTORY_MASTER_STATUS_LABEL: Record<InventoryMasterStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
}

// GET /inventory-masters/report — no query params (empty backend schema),
// always an organisation-wide aggregate. Gated on inventory-master:manage alone.
export interface InventoryMasterReportResponse {
  summary: { catalogItems: number }
  catalog: {
    byType: { type: InventoryMasterType; count: number }[]
    byStatus: { status: InventoryMasterStatus; count: number }[]
  }
}

export interface InventoryMasterEntity {
  id: string
  code: string
  name: string
  description: string
  type: InventoryMasterType
  sku: string
  unit: string
  minStock: number
  createdAt: string
  updatedAt: string
  // Key is ABSENT unless the caller holds `inventory-master:manage` — the
  // mapper only sets this field conditionally.
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
}

export interface UpdateInventoryMasterPayload {
  // `code` is intentionally absent — the service never reads it from the
  // update payload, so the natural key is immutable post-create.
  name?: string
  description?: string
  sku?: string
  unit?: string
  type?: InventoryMasterType
  status?: InventoryMasterStatus
  minStock?: number
}
