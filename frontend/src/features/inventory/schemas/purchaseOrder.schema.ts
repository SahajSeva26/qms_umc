import { z } from 'zod'
import { PAY_TERMS } from '@/features/inventory/inventory.types'

// Validates ProcurementTab.tsx's "Generate purchase order" (PO) form
// (PoCreateFormValues). savePOCreate() already throws "Enter quantity" if
// qty is falsy (0/NaN only, negatives slip through) — tightened here to a
// genuine positive-quantity rule. `itemId`/`vendorId` are required <Select>s
// (Task 5's "Required item"/"Required vendor" examples) validated
// defensively. unitRate/gst/freight/deliveryDays have no current explicit
// check, but a zero-or-negative unit rate or delivery window isn't a
// meaningful PO, and a negative GST/freight doesn't make sense either — all
// four get the same non-negative-or-positive floor their own semantics imply.
export const purchaseOrderSchema = z.object({
  itemId: z.string().trim().min(1, 'Select an item'),
  vendorId: z.string().trim().min(1, 'Select a vendor'),
  qty: z.number().positive('Enter a quantity greater than 0'),
  unitRate: z.number().positive('Unit rate must be greater than 0'),
  gst: z.number().min(0, 'GST % cannot be negative'),
  freight: z.number().min(0, 'Freight cannot be negative'),
  paymentTerms: z.enum(PAY_TERMS),
  deliveryDays: z.number().positive('Delivery days must be greater than 0'),
})

export type PurchaseOrderForm = z.infer<typeof purchaseOrderSchema>
