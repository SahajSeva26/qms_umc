import { z } from 'zod'

const INVENTORY_MASTER_TYPE_VALUES = ['device', 'consumable', 'accessory', 'other'] as const
const INVENTORY_MASTER_STATUS_VALUES = ['active', 'inactive'] as const

const stockNumber = z.number('Must be a number.').int('Must be a whole number.').nonnegative('Must be 0 or more.')

export const createInventoryMasterSchema = z.object({
  code: z.string().trim().min(1, 'Code is required.'),
  name: z.string().trim().min(1, 'Name is required.'),
  // Required on the backend model, easy to overlook since many master-data
  // forms treat description as optional.
  description: z.string().trim().min(1, 'Description is required.'),
  sku: z.string().trim().min(1, 'SKU is required.'),
  unit: z.string().trim().min(1, 'Unit is required.'),
  type: z.enum(INVENTORY_MASTER_TYPE_VALUES),
  status: z.enum(INVENTORY_MASTER_STATUS_VALUES),
  minStock: stockNumber,
  maxStock: stockNumber,
})

// code is excluded — immutable post-create (backend silently ignores it on update).
export const updateInventoryMasterSchema = createInventoryMasterSchema.omit({ code: true })

// One shared shape for the RHF form itself (superset of both payloads, code
// always present in the form even though the update payload strips it before
// sending) — avoids maintaining a 3rd, hand-written form-values type that
// could drift from the two real payload schemas.
export type InventoryMasterFormValues = z.infer<typeof createInventoryMasterSchema>
