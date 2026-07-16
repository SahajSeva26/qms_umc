import { z } from 'zod'
import { ROLE_TYPE_CODES } from '@/features/pbac/role-type/constants/roleTypeCodes'

// Validation schemas for the role-type create/update forms. Follows the
// exact pattern of `@/features/pbac/tenant/schemas/tenant.schemas.ts` /
// `permissionGroup.schemas.ts` — zod objects run through safeParse, first
// issue message surfaced to the user.

// `code` is constrained to the backend's ALLOWED_ROLETYPE_CODES_ARRAY enum
// (see roleTypeCodes.ts) — the `{tenantCode}.admin` reserved pattern is a
// system-seeded exception this form never emits, so it isn't part of the enum.
export const createRoleTypeSchema = z.object({
  code: z.enum(ROLE_TYPE_CODES as [string, ...string[]], { message: 'Select a valid role type code' }),
  name: z.string().trim().min(1, 'Name is required'),
  description: z.string().trim().optional(),
  tenant: z.string().trim().min(1, 'Tenant is required'),
  // The "shopping cart" list of bare permission codes (per
  // CreateRoleTypePayload.permissions: string[]), ceiling-checked client-side
  // (and re-checked server-side) against the tenant's own PermissionGroup.
  permissions: z.array(z.string()).optional(),
})

export type CreateRoleTypeFormValues = z.infer<typeof createRoleTypeSchema>

export const updateRoleTypeSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').optional(),
  description: z.string().trim().optional(),
  status: z.enum(['active', 'inactive']).optional(),
  permissions: z.array(z.string()).optional(),
})

export type UpdateRoleTypeFormValues = z.infer<typeof updateRoleTypeSchema>
