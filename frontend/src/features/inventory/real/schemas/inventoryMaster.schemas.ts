import { z } from 'zod'

// Matches backend ITEM_TYPES exactly — 'accessory'/'other' exist only as
// dead, commented-out backend constants, not accepted values.
const INVENTORY_MASTER_TYPE_VALUES = ['device', 'consumable'] as const
const INVENTORY_MASTER_STATUS_VALUES = ['active', 'inactive'] as const

// No upper bound existed before — an unbounded number saved silently.
// 10M is generous headroom while still catching an obvious fat-finger entry.
const stockNumber = z.number('Must be a number.').int('Must be a whole number.').nonnegative('Must be 0 or more.').max(10_000_000, 'Must be 10,000,000 or less.')

// Neither frontend nor backend validates minStock against maxStock —
// without this, minStock:100/maxStock:5 saves cleanly with no warning.
const noMinAboveMax = <T extends { minStock: number; maxStock: number }>(values: T, ctx: z.RefinementCtx) => {
  if (values.minStock > values.maxStock) {
    ctx.addIssue({ code: 'custom', message: 'Min stock cannot exceed max stock.', path: ['maxStock'] })
  }
}

// No upper bound existed before — an unbounded value could stretch the edit
// form past the viewport. 200 matches other identifier fields; description gets 2000 as free-form prose.
const identifierString = (label: string) => z.string().trim().min(1, `${label} is required.`).max(200, `${label} must be 200 characters or fewer.`)

const baseInventoryMasterSchema = z.object({
  code: identifierString('Code').regex(/^\S+$/, 'Code cannot contain spaces.'),
  name: identifierString('Name'),
  // Required on the backend model, easy to overlook since many master-data
  // forms treat description as optional.
  description: z.string().trim().min(1, 'Description is required.').max(2000, 'Description must be 2000 characters or fewer.'),
  sku: identifierString('SKU'),
  unit: identifierString('Unit'),
  type: z.enum(INVENTORY_MASTER_TYPE_VALUES),
  status: z.enum(INVENTORY_MASTER_STATUS_VALUES),
  minStock: stockNumber,
  maxStock: stockNumber,
})

export const createInventoryMasterSchema = baseInventoryMasterSchema.superRefine(noMinAboveMax)

// code is excluded — immutable post-create (backend silently ignores it on update).
export const updateInventoryMasterSchema = baseInventoryMasterSchema.omit({ code: true }).superRefine(noMinAboveMax)

// One shared shape for the RHF form itself (superset of both payloads, code
// always present in the form even though the update payload strips it before
// sending) — avoids maintaining a 3rd, hand-written form-values type that
// could drift from the two real payload schemas.
export type InventoryMasterFormValues = z.infer<typeof createInventoryMasterSchema>
