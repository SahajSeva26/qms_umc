import { z } from 'zod'

// Validation schemas for the contact create/edit forms. Follows the exact
// pattern of `@/features/access-management/tenant/schemas/tenant.schemas.ts` —
// zod objects run through safeParse, first issue message surfaced to the user.
// Matches backend CreateContactPayloadSchema/UpdateContactPayloadSchema
// (contact.validators.ts) exactly: tenant is required only for platform
// staff and is resolved server-side for a customer-tenant caller regardless
// of what's sent, so it's optional here too.

export const createContactSchema = z.object({
  tenant: z.string().optional(),
  name: z.string().trim().min(1, 'Name is required'),
  designation: z.string().trim().optional(),
  email: z.string().trim().email('Enter a valid email').optional().or(z.literal('')),
  phone: z.string().trim().optional(),
  location: z.string().trim().optional(),
  type: z.enum(['customer', 'platform']).optional(),
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
