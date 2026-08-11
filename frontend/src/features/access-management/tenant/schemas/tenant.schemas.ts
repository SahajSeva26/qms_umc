import { z } from 'zod'
import { PASSWORD_MIN_LENGTH } from '@/features/access-management/accessManagement.constants'

export const updateTenantSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  description: z.string().trim().optional(),
  // Only takes effect server-side if caller has `tenant:manage`; the field is
  // still validated client-side so the request shape is always well-formed.
  status: z.enum(['active', 'inactive']).optional(),
  // Only takes effect server-side if caller has `system:manage`.
  type: z.enum(['platform', 'customer']).optional(),
  salesPerson: z.string().optional().nullable(),
})

// Code must not look like a Mongo ObjectId (24 hex chars) — backend rejects it.
const MONGO_OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/

export const createTenantSchema = z.object({
  code: z
    .string()
    .trim()
    .min(3, 'Company code must be at least 3 characters')
    .toLowerCase()
    .refine((val) => !MONGO_OBJECT_ID_REGEX.test(val), {
      message: 'Company code must not look like an ObjectId',
    }),
  name: z.string().trim().min(1, 'Company name is required'),
  description: z.string().trim().optional(),
  // Frontend-required (see accessManagement.types.ts's CreateTenantPayload comment).
  salesPerson: z.string().min(1, 'Sales rep is required'),
  owner: z.object({
    firstName: z.string().trim().min(1, "Owner's first name is required"),
    lastName: z.string().trim().optional(),
    email: z.string().trim().min(1, 'Owner email is required').email('Enter a valid email'),
    password: z.string().min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`),
    phone: z.string().trim().optional(),
    gender: z.enum(['male', 'female', 'other']).optional(),
  }),
})
