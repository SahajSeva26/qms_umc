import { z } from 'zod'

export const createBrandSchema = z.object({
  division: z.string().trim().min(1, 'Division is required.'),
  name: z.string().trim().min(1, 'Name is required.'),
})

// division AND name are immutable post-create — the backend derives `code` from
// `name` once and never recomputes it, so a rename would desync name vs. code.
export const updateBrandSchema = z.object({
  status: z.enum(['active', 'inactive']).optional(),
})
