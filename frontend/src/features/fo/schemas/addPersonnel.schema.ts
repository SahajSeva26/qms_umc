import { z } from 'zod'

const INDIAN_MOBILE_REGEX = /^(?:\+91[\s-]?|91[\s-]?|0)?[6-9]\d{9}$/

export const addPersonnelSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  email: z.string().trim().email('Enter a valid email').optional().or(z.literal('')),
  phone: z.string().trim().regex(INDIAN_MOBILE_REGEX, 'Enter a valid mobile number').optional().or(z.literal('')),
  salary: z.coerce.number({ error: 'Salary must be a number' }).min(0, 'Salary cannot be negative'),
})

export type AddPersonnelFormValues = z.infer<typeof addPersonnelSchema>
