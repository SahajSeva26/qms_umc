import { z } from 'zod'

const INVENTORY_REQUEST_TYPE_VALUES = ['refill', 'return'] as const
const INVENTORY_REQUEST_ITEM_TYPE_VALUES = ['InventoryMaster', 'InventoryDevice', 'InventoryConsumable'] as const

const lineItemSchema = z.object({
  itemType: z.enum(INVENTORY_REQUEST_ITEM_TYPE_VALUES),
  item: z.string().trim().min(1, 'Select an item.'),
  quantity: z.number('Must be a number.').int('Must be a whole number.').positive('Must be at least 1.').optional(),
})

// type is create-only (immutable — the update schema never accepts it).
export const createInventoryRequestSchema = z.object({
  type: z.enum(INVENTORY_REQUEST_TYPE_VALUES),
  lineItems: z.array(lineItemSchema).min(1, 'At least one line item is required.'),
})
export type InventoryRequestCreateFormValues = z.infer<typeof createInventoryRequestSchema>

// Edit-mode (only while status === 'requested') — lineItems only, type is
// immutable and not part of this form.
export const updateInventoryRequestSchema = z.object({
  lineItems: z.array(lineItemSchema).min(1, 'At least one line item is required.'),
})
export type InventoryRequestUpdateFormValues = z.infer<typeof updateInventoryRequestSchema>

export const moveInventoryRequestStageSchema = z.object({
  to: z.string().trim().min(1),
  reason: z.string().trim().min(1, 'A reason is required.'),
})
export type MoveInventoryRequestStageFormValues = z.infer<typeof moveInventoryRequestStageSchema>
