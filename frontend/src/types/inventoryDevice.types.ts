// Real backend-wired Inventory Device types — matches
// backend/src/modules/inventory/inventory-device exactly. A device is an
// individual physical unit (unique serialNumber) of an InventoryMaster
// catalog item — separate from features/inventory/inventory.types.ts, which
// is the older, mock-data device model the still-mock Inventory & Devices
// tabs use.

export type InventoryDeviceStatus = 'available' | 'in-transit' | 'assigned' | 'maintainance' | 'lost' | 'damaged'

export const INVENTORY_DEVICE_STATUSES: InventoryDeviceStatus[] = ['available', 'in-transit', 'assigned', 'maintainance', 'lost', 'damaged']

// 'maintainance' is a real backend typo baked into the wire value — kept
// verbatim here; only the display label is spelled correctly.
export const INVENTORY_DEVICE_STATUS_LABEL: Record<InventoryDeviceStatus, string> = {
  available: 'Available',
  'in-transit': 'In transit',
  assigned: 'Assigned',
  maintainance: 'Maintenance',
  lost: 'Lost',
  damaged: 'Damaged',
}

export interface InventoryDeviceItemRef {
  id: string
  code?: string
  name?: string
  sku?: string
  unit?: string
}

export interface InventoryDeviceEntity {
  id: string
  item: InventoryDeviceItemRef
  serialNumber: string
  // Never permission-gated — every authenticated reader sees the real status.
  status: InventoryDeviceStatus
  manufacturingDate?: string
  warrantyExpiryDate?: string
  lastCalibrationDate?: string
  nextCalibrationDate?: string
  createdAt: string
  updatedAt: string
}

export interface SearchInventoryDeviceQuery {
  item?: string
  serialNumber?: string
  status?: InventoryDeviceStatus
  page?: string
  limit?: string
}

export interface CreateInventoryDevicePayload {
  item: string
  serialNumber: string
  manufacturingDate?: string
  warrantyExpiryDate?: string
  lastCalibrationDate?: string
  nextCalibrationDate?: string
}

export interface UpdateInventoryDevicePayload {
  // item/serialNumber intentionally absent — immutable post-create.
  manufacturingDate?: string
  warrantyExpiryDate?: string
  status?: InventoryDeviceStatus
  lastCalibrationDate?: string
  nextCalibrationDate?: string
}
