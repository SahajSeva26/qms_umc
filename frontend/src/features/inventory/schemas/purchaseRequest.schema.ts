import { z } from 'zod'
import { PR_SOURCES } from '@/features/inventory/inventory.types'

// Validates ProcurementTab.tsx's "New requisition" (PR) form (PrFormValues).
// savePR() already throws "Enter quantity" if qty is falsy — that check only
// catches 0/NaN, not negatives, so this tightens it to a genuine positive-
// quantity rule without inventing a new concept. `itemId` is a required
// <Select> (always populated from the consumables list) — validated
// defensively. `source`/`reason` have no current requirement, so they stay
// as-is: source constrained to its fixed dropdown values, reason optional.
export const purchaseRequestSchema = z.object({
  itemId: z.string().trim().min(1, 'Select an item'),
  qty: z.number().positive('Enter a quantity greater than 0'),
  source: z.enum(PR_SOURCES),
  reason: z.string().optional(),
})

export type PurchaseRequestForm = z.infer<typeof purchaseRequestSchema>
