import { z } from 'zod'

// Validates LogMovementModal.tsx's "Log inventory movement" form
// (LogMovementInput). The only rule the component currently enforces is
// "Select a unit" (unitId non-blank) — logMovement() itself separately
// throws if the unit isn't found in the live unit list (a runtime/business-
// state check this schema cannot and should not replace, since it depends on
// data outside the form). `from`/`to`/`notes` are plain free-text fields with
// no current requirement, so they stay optional.
const MOVEMENT_TYPES = ['HANDOVER', 'RETURN', 'TRANSFER', 'CALIB', 'PROCURE', 'RETIRE'] as const

export const movementSchema = z.object({
  type: z.enum(MOVEMENT_TYPES),
  date: z.string().trim().min(1, 'Date is required'),
  unitId: z.string().trim().min(1, 'Select a unit'),
  from: z.string().optional(),
  to: z.string().optional(),
  notes: z.string().optional(),
})

export type MovementForm = z.infer<typeof movementSchema>
