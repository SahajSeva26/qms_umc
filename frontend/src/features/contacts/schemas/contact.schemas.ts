import { z } from 'zod'

// tenant is optional client-side — resolved server-side for a customer-tenant
// caller regardless of what's sent, required only for platform staff.
export const createContactSchema = z
  .object({
    tenant: z.string().optional(),
    division: z.string().optional(),
    name: z.string().trim().min(1, 'Name is required'),
    designation: z.string().trim().optional(),
    email: z.string().trim().email('Enter a valid email').optional().or(z.literal('')),
    phone: z.string().trim().optional(),
    location: z.string().trim().optional(),
    type: z.enum(['customer', 'platform']).optional(),
  })
  // division is required for 'customer'-type contacts (the default type).
  .refine((data) => (data.type ?? 'customer') !== 'customer' || !!data.division, {
    message: 'A division is required for customer contacts',
    path: ['division'],
  })

export const updateContactSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  designation: z.string().trim().optional(),
  email: z.string().trim().email('Enter a valid email').optional().or(z.literal('')),
  phone: z.string().trim().optional(),
  location: z.string().trim().optional(),
  type: z.enum(['customer', 'platform']).optional(),
  status: z.enum(['active', 'inactive']).optional(),
})
