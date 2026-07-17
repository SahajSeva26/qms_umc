import { z } from 'zod'

export const updateUserSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required'),
  lastName: z.string().trim().optional(),
})

export type UpdateUserFormValues = z.infer<typeof updateUserSchema>
