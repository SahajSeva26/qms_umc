import { z } from 'zod'
import { ROLE_FORBIDDEN_PERMISSIONS } from '@/features/pbac/role/constants/roleForbiddenPermissions'

// Validation schemas for the role create/update forms. Follows the exact
// pattern of `@/features/pbac/role-type/schemas/roleType.schemas.ts` — zod
// objects run through safeParse, first issue message surfaced to the user.
//
// `permissions` here are the Role's own "elevated permissions" (conceptually
// layered ON TOP of whatever the bound RoleType already grants, e.g. a
// same-domain grant like 'sales.manage' for a single person) — NOT a
// duplication of the RoleType's permission list. Per role.service.ts's
// `ROLE_FORBIDDEN_PERMISSIONS` denylist, a Role may never directly hold
// 'tenant:admin' / 'tenant:manage' / 'system:manage' — refined here with a
// zod `.refine` so a hand-crafted payload can never even reach the request,
// on top of the picker UI already excluding those three codes from its
// choices entirely.
const forbidRoleForbiddenPermissions = (permissions: string[] | undefined) =>
  !permissions || permissions.every((code) => !ROLE_FORBIDDEN_PERMISSIONS.includes(code))

export const registerOwnerSchema = z.object({
  firstName: z.string().trim().min(1, "User's first name is required"),
  lastName: z.string().trim().optional(),
  email: z.string().trim().min(1, 'User email is required').email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  phone: z.string().trim().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
})

export const createRoleSchema = z.object({
  code: z.string().trim().min(1, 'Code is required').toLowerCase(),
  name: z.string().trim().min(1, 'Name is required'),
  description: z.string().trim().optional(),
  type: z.string().trim().min(1, 'Role type is required'),
  tenant: z.string().trim().min(1, 'Tenant is required'),
  permissions: z
    .array(z.string())
    .optional()
    .refine(forbidRoleForbiddenPermissions, { message: 'A role cannot directly hold elevated tenant/system permissions' }),
  user: registerOwnerSchema,
})

export type CreateRoleFormValues = z.infer<typeof createRoleSchema>

export const updateRoleUserSchema = z.object({
  firstName: z.string().trim().min(1).optional(),
  lastName: z.string().trim().optional(),
  status: z.enum(['active', 'inactive', 'suspended', 'deleted']).optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
})

export const updateRoleSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').optional(),
  description: z.string().trim().optional(),
  status: z.enum(['active', 'inactive']).optional(),
  type: z.string().trim().optional(),
  permissions: z
    .array(z.string())
    .optional()
    .refine(forbidRoleForbiddenPermissions, { message: 'A role cannot directly hold elevated tenant/system permissions' }),
  user: updateRoleUserSchema.optional(),
})

export type UpdateRoleFormValues = z.infer<typeof updateRoleSchema>
