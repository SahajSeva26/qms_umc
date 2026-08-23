// Real backend-wired Inventory Request types — matches
// backend/src/modules/inventory/inventory-request exactly. The FO
// refill/return lifecycle: a refill line targets the catalog
// (InventoryMaster); a return line targets actual held stock
// (InventoryDevice/InventoryConsumable).

export type InventoryRequestType = 'refill' | 'return'

export type InventoryRequestStatus = 'requested' | 'approved' | 'rejected' | 'received' | 'cancelled'

export const INVENTORY_REQUEST_STATUSES: InventoryRequestStatus[] = ['requested', 'approved', 'rejected', 'received', 'cancelled']

export const INVENTORY_REQUEST_STATUS_LABEL: Record<InventoryRequestStatus, string> = {
  requested: 'Requested',
  approved: 'Approved',
  rejected: 'Rejected',
  received: 'Received',
  cancelled: 'Cancelled',
}

export const INVENTORY_REQUEST_TYPE_LABEL: Record<InventoryRequestType, string> = {
  refill: 'Refill',
  return: 'Return',
}

// Verbatim port of the backend's own transition maps
// (inventory-request.constants.ts) — the client-side source of truth for
// which moveStage actions to offer, mirrored not reimplemented independently.
export const INVENTORY_REQUEST_TRANSITION_MAP: Record<InventoryRequestType, Record<InventoryRequestStatus, InventoryRequestStatus[]>> = {
  refill: {
    requested: ['approved', 'rejected', 'cancelled'],
    approved: ['received', 'cancelled'],
    rejected: ['requested'],
    received: [],
    cancelled: [],
  },
  return: {
    requested: ['approved', 'rejected', 'cancelled'],
    approved: [],
    rejected: ['requested'],
    received: [],
    cancelled: [],
  },
}

export type InventoryRequestItemType = 'InventoryMaster' | 'InventoryDevice' | 'InventoryConsumable'

export const ALLOWED_ITEM_TYPES_BY_REQUEST_TYPE: Record<InventoryRequestType, InventoryRequestItemType[]> = {
  refill: ['InventoryMaster'],
  return: ['InventoryDevice', 'InventoryConsumable'],
}

export interface InventoryRequestRoleRef {
  id: string
  name?: string
  code?: string
}

export interface InventoryRequestItemRef {
  id: string
  // device shape
  serialNumber?: string
  status?: string
  // consumable shape
  batch?: string
  expiryDate?: string
  // master shape
  code?: string
  name?: string
  type?: string
}

export interface InventoryRequestFulfillmentLine {
  itemType: 'InventoryDevice' | 'InventoryConsumable'
  item: string
  quantity: number
}

export interface InventoryRequestLineItem {
  itemType: InventoryRequestItemType
  item: InventoryRequestItemRef
  quantity: number
  fulfillment: InventoryRequestFulfillmentLine[]
}

export interface InventoryRequestStageHistoryEntry {
  from: InventoryRequestStatus
  to: InventoryRequestStatus
  reason: string
  actor?: { roleId?: string; name?: string; email?: string }
}

export interface InventoryRequestEntity {
  id: string
  type: InventoryRequestType
  status: InventoryRequestStatus
  requestedBy: InventoryRequestRoleRef
  processedBy?: InventoryRequestRoleRef
  lineItems: InventoryRequestLineItem[]
  stageHistory: InventoryRequestStageHistoryEntry[]
  createdAt: string
  updatedAt: string
}

export interface SearchInventoryRequestQuery {
  type?: InventoryRequestType
  status?: InventoryRequestStatus
  requestedBy?: string
  processedBy?: string
  item?: string
  itemType?: InventoryRequestItemType
  page?: string
  limit?: string
}

export interface InventoryRequestLineItemPayload {
  itemType: InventoryRequestItemType
  item: string
  quantity?: number
}

export interface CreateInventoryRequestPayload {
  type: InventoryRequestType
  lineItems: InventoryRequestLineItemPayload[]
}

export interface UpdateInventoryRequestPayload {
  lineItems: InventoryRequestLineItemPayload[]
}

export interface MoveInventoryRequestStagePayload {
  to: InventoryRequestStatus
  reason: string
}

// Mirrors moveStage's own authorization rule (inventory-request.service.ts) —
// NOT reimplemented independently, ported verbatim from the confirmed source:
// a manager may perform any valid transition; a non-manager requester may
// only: refill -> cancelled/received, return -> cancelled.
export const getAllowedStageActions = (
  type: InventoryRequestType,
  status: InventoryRequestStatus,
  canManage: boolean,
): InventoryRequestStatus[] => {
  const validTransitions = INVENTORY_REQUEST_TRANSITION_MAP[type][status] ?? []
  if (canManage) return validTransitions

  const selfServiceAllowed: InventoryRequestStatus[] = type === 'refill' ? ['cancelled', 'received'] : ['cancelled']
  return validTransitions.filter((s) => selfServiceAllowed.includes(s))
}
