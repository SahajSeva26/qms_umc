import { z } from 'zod'

// Validates TransfersTab.tsx's "Deliver + POD" form (DeliverPodInput). The
// component currently enforces exactly one rule — "POD reference is
// required" (ref non-blank) — saveDeliver() repeats the same check
// server-side as a defensive guard against non-UI callers, which is left
// untouched (it's service-layer, not this form's manual validation).
// `by`/`photo` are genuinely optional today (no current requirement), so
// they stay optional. `at` (delivery date) is always populated by the form's
// own date-input default, but is validated as required since a delivery
// record without a date isn't meaningful.
export const transferDeliverPodSchema = z.object({
  ref: z.string().trim().min(1, 'POD reference is required'),
  by: z.string().optional(),
  at: z.string().trim().min(1, 'Delivery date is required'),
  photo: z.string().optional(),
})

export type TransferDeliverPodForm = z.infer<typeof transferDeliverPodSchema>
