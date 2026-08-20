import type { InventoryRequestStatus, InventoryRequestType } from '@/types/inventoryRequest.types'
import type { InventoryDeviceStatus } from '@/types/inventoryDevice.types'
import type { InventoryConsumableStatus } from '@/types/inventoryConsumable.types'

export type InventoryLedgerItemType = 'InventoryDevice' | 'InventoryConsumable'

export type InventoryLedgerLocation = 'warehouse' | 'in-transit' | 'field-officer'

export const INVENTORY_LEDGER_LOCATION_LABEL: Record<InventoryLedgerLocation, string> = {
  warehouse: 'Warehouse',
  'in-transit': 'In transit',
  'field-officer': 'Field officer',
}

export interface InventoryLedgerRequestRef {
  id: string
  type?: InventoryRequestType
  status?: InventoryRequestStatus
}

export interface InventoryLedgerInventoryRef {
  id: string
  // device shape
  serialNumber?: string
  status?: string
  // consumable shape
  batch?: string
  expiryDate?: string
}

export interface InventoryLedgerRoleRef {
  id: string
  name?: string
  code?: string
}

export interface InventoryLedgerActor {
  roleId?: string
  name?: string
  email?: string
}

// request/inventory/assignee can each be populated, id-only, or null — every ref here is nullable to match.
export interface InventoryLedgerEntity {
  id: string
  request: InventoryLedgerRequestRef | null
  requestType: InventoryRequestType
  inventoryType: InventoryLedgerItemType
  inventory: InventoryLedgerInventoryRef | null
  quantity: number
  from: InventoryLedgerLocation
  to: InventoryLedgerLocation
  assignee: InventoryLedgerRoleRef | null
  actor: InventoryLedgerActor | null
  createdAt: string
}

export interface SearchInventoryLedgerQuery {
  request?: string
  requestType?: InventoryRequestType
  inventoryType?: InventoryLedgerItemType
  inventory?: string
  assignee?: string
  from?: InventoryLedgerLocation
  to?: InventoryLedgerLocation
  page?: string
  limit?: string
}

// One human event label per backend movement function, keyed by (requestType, from, to).
const MOVEMENT_EVENT_LABEL: Record<InventoryRequestType, Partial<Record<InventoryLedgerLocation, Partial<Record<InventoryLedgerLocation, string>>>>> = {
  refill: {
    warehouse: { 'in-transit': 'Refill reserved' },
    'in-transit': { 'field-officer': 'Refill issued', warehouse: 'Refill cancelled — stock released' },
  },
  return: {
    'field-officer': { 'in-transit': 'Return collected from FO' },
    // Same label for a rejected or cancelled return — the row can't tell them apart, only the request's current status can.
    'in-transit': { warehouse: 'Return restocked', 'field-officer': 'Return reversed — stock returned to field officer' },
  },
}

export const movementEventLabel = (requestType: InventoryRequestType, from: InventoryLedgerLocation, to: InventoryLedgerLocation): string =>
  MOVEMENT_EVENT_LABEL[requestType]?.[from]?.[to] ?? `${INVENTORY_LEDGER_LOCATION_LABEL[from]} → ${INVENTORY_LEDGER_LOCATION_LABEL[to]}`

export interface InventoryMovementDeviceSummary {
  serialNumber: string
  itemName: string
  status: InventoryDeviceStatus
}

export interface InventoryMovementConsumableSummary {
  batch: string
  itemName: string
  quantity: number
  status?: InventoryConsumableStatus
  expiryDate: string
}

// Discriminated on (mode, inventoryType) so a device can only ever pair with DeviceSummary, never ConsumableSummary.
export type InventoryMovementHistorySource =
  | { mode: 'request'; requestId: string; requestType: InventoryRequestType; requestStatus: InventoryRequestStatus }
  | { mode: 'inventory'; inventoryType: 'InventoryDevice'; inventoryId: string; summary: InventoryMovementDeviceSummary }
  | { mode: 'inventory'; inventoryType: 'InventoryConsumable'; inventoryId: string; summary: InventoryMovementConsumableSummary }
