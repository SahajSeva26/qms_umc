import { z } from 'zod'

// Kept local, not imported from features/projects/schemas/project.schemas.ts
// — same shape (`{reason}`) but cross-feature schema imports violate the
// feature-isolation rule (CLAUDE.md §3) even when identical.
export const moveInvoiceStageSchema = z.object({
  reason: z.string().trim().min(1, 'A reason is required to change status.'),
})

// Mirrors CreateInvoicePayloadSchema — camps is the multi-select from the
// eligible-camps picker.
export const createInvoiceSchema = z.object({
  project: z.string().min(1, 'Select a project.'),
  camps: z.array(z.string()).min(1, 'Select at least one camp to bill.'),
  dueDate: z.string().optional(),
  tax: z.number().nonnegative().optional(),
  discount: z.number().nonnegative().optional(),
})
