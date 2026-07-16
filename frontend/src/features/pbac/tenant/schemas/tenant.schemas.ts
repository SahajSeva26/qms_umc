import { z } from 'zod'

// Validation schemas for the tenant create/update forms. Follows the exact
// pattern of `@/features/admin/schemas/user.schemas.ts` — zod objects run
// through safeParse, first issue message surfaced to the user.

export const updateTenantSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  description: z.string().trim().optional(),
  // Only takes effect server-side if caller has `tenant:manage`; the field is
  // still validated client-side so the request shape is always well-formed.
  status: z.enum(['active', 'inactive']).optional(),
  // Only takes effect server-side if caller has `system:manage`.
  type: z.enum(['platform', 'customer']).optional(),
})

export type UpdateTenantFormValues = z.infer<typeof updateTenantSchema>

// CreateTenantPayload embeds a full owner-user registration payload
// (RegisterOwnerPayload) per pbac.types.ts — the create form collects both
// tenant fields and the initial admin user's account fields together.
// Matches backend `CreateTenantPayloadSchema.code` (tenant.validators.ts):
// min(3), lowercased, and must not look like a Mongo ObjectId (24 hex chars).
const MONGO_OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/

export const createTenantSchema = z.object({
  code: z
    .string()
    .trim()
    .min(3, 'Tenant code must be at least 3 characters')
    .toLowerCase()
    .refine((val) => !MONGO_OBJECT_ID_REGEX.test(val), {
      message: 'Tenant code must not look like an ObjectId',
    }),
  name: z.string().trim().min(1, 'Tenant name is required'),
  description: z.string().trim().optional(),
  owner: z.object({
    firstName: z.string().trim().min(1, "Owner's first name is required"),
    lastName: z.string().trim().optional(),
    email: z.string().trim().min(1, 'Owner email is required').email('Enter a valid email'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    phone: z.string().trim().optional(),
    gender: z.enum(['male', 'female', 'other']).optional(),
  }),
})

export type CreateTenantFormValues = z.infer<typeof createTenantSchema>
