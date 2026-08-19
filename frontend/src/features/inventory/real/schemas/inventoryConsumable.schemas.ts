import { z } from 'zod'

const INVENTORY_CONSUMABLE_STATUS_VALUES = ['active', 'expired'] as const

// No upper bound existed before — a 14-digit quantity saved without warning.
// 10 million is generous for any real stock count while still catching an
// obvious fat-finger/overflow entry.
const quantityNumber = z.number('Must be a number.').int('Must be a whole number.').nonnegative('Must be 0 or more.').max(10_000_000, 'Must be 10,000,000 or less.')

// Neither the frontend nor the backend checked expiryDate against
// manufacturingDate before — a lot expiring a year before it was
// manufactured saved cleanly and displayed as ACTIVE with no warning. Both
// fields are plain YYYY-MM-DD <input type="date"> strings, so a lexical
// comparison is a correct date comparison.
const noExpiryBeforeManufacturing = <T extends { manufacturingDate: string; expiryDate: string }>(values: T, ctx: z.RefinementCtx) => {
  if (values.manufacturingDate && values.expiryDate && values.expiryDate < values.manufacturingDate) {
    ctx.addIssue({ code: 'custom', message: 'Expiry date cannot be before the manufacturing date.', path: ['expiryDate'] })
  }
}

// Create-only field (item) — immutable post-create, so this resolver is
// only ever used for the create-mode form.
export const createInventoryConsumableSchema = z.object({
  item: z.string().trim().min(1, 'Item is required.'),
  // No upper bound existed before — batch is editable (unlike device's
  // serialNumber), so an oversized value here would hit the same
  // create/edit-modal overflow risk as Item Master's Name field did.
  batch: z.string().trim().min(1, 'Batch is required.').max(200, 'Batch must be 200 characters or fewer.'),
  manufacturingDate: z.string().trim().min(1, 'Manufacturing date is required.'),
  expiryDate: z.string().trim().min(1, 'Expiry date is required.'),
  quantity: quantityNumber.optional(),
}).superRefine(noExpiryBeforeManufacturing)
export type InventoryConsumableCreateFormValues = z.infer<typeof createInventoryConsumableSchema>

// Edit-mode fields only — item is shown as read-only text in the UI and
// never part of this form's fields at all. `status` is only rendered/
// submitted by the component when the caller holds inventory-consumable:manage.
export const updateInventoryConsumableSchema = z.object({
  // No upper bound existed before — batch is editable (unlike device's
  // serialNumber), so an oversized value here would hit the same
  // create/edit-modal overflow risk as Item Master's Name field did.
  batch: z.string().trim().min(1, 'Batch is required.').max(200, 'Batch must be 200 characters or fewer.'),
  manufacturingDate: z.string().trim().min(1, 'Manufacturing date is required.'),
  expiryDate: z.string().trim().min(1, 'Expiry date is required.'),
  quantity: quantityNumber,
  status: z.enum(INVENTORY_CONSUMABLE_STATUS_VALUES).optional(),
}).superRefine(noExpiryBeforeManufacturing)
export type InventoryConsumableUpdateFormValues = z.infer<typeof updateInventoryConsumableSchema>
