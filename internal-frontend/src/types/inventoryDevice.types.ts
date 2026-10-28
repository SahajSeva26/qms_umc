// Matches backend/inventory-device exactly. A device is an individual
// physical unit (unique serialNumber) of an InventoryMaster catalog item.

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

// GET /inventory-devices/report — no query params (empty backend schema),
// always an organisation-wide aggregate. Gated on inventory-device:manage alone.
export interface InventoryDeviceReportResponse {
  summary: { totalDevices: number }
  devices: { byStatus: { status: InventoryDeviceStatus; count: number }[] }
}

export interface InventoryDeviceItemRef {
  id: string
  code?: string
  name?: string
  sku?: string
  unit?: string
}

// Populated to {id, code, name} when hydrated, {id} only when not. Can be
// null — legacy stored records may lack the reference despite it being required now.
export interface InventoryDeviceVendorRef {
  id: string
  code?: string
  name?: string
}

export interface InventoryDeviceEntity {
  id: string
  item: InventoryDeviceItemRef
  vendor: InventoryDeviceVendorRef | null
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
  vendor: string
  serialNumber: string
  manufacturingDate?: string
  warrantyExpiryDate?: string
  lastCalibrationDate?: string
  nextCalibrationDate?: string
}

export interface UpdateInventoryDevicePayload {
  // item/vendor/serialNumber intentionally absent — immutable post-create.
  manufacturingDate?: string
  warrantyExpiryDate?: string
  status?: InventoryDeviceStatus
  lastCalibrationDate?: string
  nextCalibrationDate?: string
}
