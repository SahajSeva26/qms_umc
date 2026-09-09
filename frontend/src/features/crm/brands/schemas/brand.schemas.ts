import { z } from 'zod'

export const createBrandSchema = z.object({
  division: z.string().trim().min(1, 'Division is required.'),
  name: z.string().trim().min(1, 'Name is required.'),
})

// division is immutable post-create, so excluded here.
export const updateBrandSchema = z.object({
  name: z.string().trim().min(1, 'Name is required.').optional(),
  status: z.enum(['active', 'inactive']).optional(),
})
