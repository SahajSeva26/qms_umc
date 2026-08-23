// Real backend-wired Inventory Assignment types — matches
// backend/src/modules/inventory/inventory-assignment exactly. One row per
// (assignee, inventoryType, inventory) triple — "who currently holds what."

export type InventoryAssignmentType = 'InventoryDevice' | 'InventoryConsumable'

export interface InventoryAssignmentRoleRef {
  id: string
  name?: string
  code?: string
}

export interface InventoryAssignmentInventoryRef {
  id: string
  // device shape
  serialNumber?: string
  status?: string
  // consumable shape
  batch?: string
  expiryDate?: string
}

export interface InventoryAssignmentEntity {
  id: string
  assignee: InventoryAssignmentRoleRef
  inventoryType: InventoryAssignmentType
  inventory: InventoryAssignmentInventoryRef
  quantity: number
  createdAt: string
  updatedAt: string
}

export interface SearchInventoryAssignmentQuery {
  assignee?: string
  inventoryType?: InventoryAssignmentType
  inventory?: string
  page?: string
  limit?: string
}

export interface CreateInventoryAssignmentPayload {
  assignee: string
  inventoryType: InventoryAssignmentType
  inventory: string
  quantity?: number
}

export interface UpdateInventoryAssignmentPayload {
  // assignee/inventoryType/inventory intentionally absent — immutable post-create.
  quantity: number
}
