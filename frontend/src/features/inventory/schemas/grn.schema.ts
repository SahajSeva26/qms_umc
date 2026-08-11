import { z } from 'zod'

// Validates ProcurementTab.tsx's "Goods receipt" (GRN) form (GrnFormValues).
// saveGRN() currently has no field-level checks at all (only "PO not found",
// a runtime/business-state check on the poId, left untouched). The form
// itself always prefills batchNo/expiryDate/invoiceNo with generated
// defaults, so requiring them non-blank never rejects real UI-driven state —
// it only catches a user clearing a field that represents a real document
// reference. Quantities get a non-negative floor (0 is a legitimate
// "nothing received/accepted/rejected" case, so `.min(0)` not `.positive()`).
export const grnSchema = z.object({
  receivedQty: z.number().min(0, 'Received quantity cannot be negative'),
  acceptedQty: z.number().min(0, 'Accepted quantity cannot be negative'),
  rejectedQty: z.number().min(0, 'Rejected quantity cannot be negative'),
  batchNo: z.string().trim().min(1, 'Batch number is required'),
  expiryDate: z.string().trim().min(1, 'Expiry date is required'),
  invoiceNo: z.string().trim().min(1, 'Invoice number is required'),
  notes: z.string().optional(),
})

export type GrnForm = z.infer<typeof grnSchema>
