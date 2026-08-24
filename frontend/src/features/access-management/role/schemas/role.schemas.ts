import { z } from 'zod'
import { ROLE_FORBIDDEN_PERMISSIONS } from '@/features/access-management/role/constants/roleForbiddenPermissions'
import { PASSWORD_MIN_LENGTH } from '@/features/access-management/accessManagement.constants'

// `permissions` are the Role's own elevated grants layered on top of the bound
// RoleType's — role.service.ts's ROLE_FORBIDDEN_PERMISSIONS denylist blocks
// 'tenant:admin'/'tenant:manage'/'system:manage', mirrored here via `.refine`.
const forbidRoleForbiddenPermissions = (permissions: string[] | undefined) =>
  !permissions || permissions.every((code) => !ROLE_FORBIDDEN_PERMISSIONS.includes(code))

const registerOwnerSchema = z.object({
  firstName: z.string().trim().min(1, "User's first name is required"),
  lastName: z.string().trim().optional(),
  email: z.string().trim().min(1, 'User email is required').email('Enter a valid email'),
  password: z.string().min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`),
  // Frontend-only requirement — backend's RegisterUserPayloadSchema keeps
  // phone optional. min(10) matches the backend's own bound (auth.validators.ts).
  phone: z.string().trim().min(10, 'Phone number must be at least 10 characters'),
  gender: z.enum(['male', 'female', 'other']).optional(),
})

export const createRoleSchema = z.object({
  code: z.string().trim().min(1, 'Code is required').toLowerCase(),
  name: z.string().trim().min(1, 'Name is required'),
  description: z.string().trim().optional(),
  type: z.string().trim().min(1, 'Role type is required'),
  tenant: z.string().trim().min(1, 'Company is required'),
  // Required-ness is enforced server-side (role.service.ts); the page's own
  // picker blocks submission client-side when one is needed.
  division: z.string().trim().optional(),
  supervisor: z.string().trim().optional(),
  permissions: z
    .array(z.string())
    .optional()
    .refine(forbidRoleForbiddenPermissions, { message: 'A role cannot directly hold elevated tenant/system permissions' }),
  user: registerOwnerSchema,
})

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
