import { z } from 'zod'

// ── Form input validation ────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

export type LoginFormValues = z.infer<typeof loginSchema>

// ── Response contract validation ─────────────────────────────────────────────

const LoginUserSchema = z
  .object({
    id: z.string(),
    email: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    avatar: z.object({ url: z.string() }).passthrough().optional(),
  })
  .passthrough()

export const LoginResponseSchema = z
  .object({
    success: z.literal(true),
    message: z.string(),
    data: LoginUserSchema,
  })
  .passthrough()

// Runtime contract check for GET /auth/me, distinct from the *.schemas.ts
// files that validate form input. Only fields actually dereferenced
// elsewhere are required; anything else is left untyped on purpose.
const SessionUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
}).passthrough()

const SessionRoleSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
}).passthrough()

const SessionRoleTypeSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
}).passthrough()

const SessionTenantSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  // EditContactModal.tsx branches directly on === 'platform'; any other
  // value would silently take the wrong path with no error anywhere.
  type: z.enum(['platform', 'customer']),
}).passthrough()

// role/roleType/tenant are required, non-nullable — a real authenticated
// session should never have any of the three come back null.
const SessionResponseDataSchema = z.object({
  user: SessionUserSchema,
  role: SessionRoleSchema,
  roleType: SessionRoleTypeSchema,
  tenant: SessionTenantSchema,
  permissions: z.array(z.string()),
}).passthrough()

export const AuthMeResponseSchema = z.object({
  // Literal true, not boolean — success: false with data present is itself the mismatch.
  success: z.literal(true),
  message: z.string(),
  data: SessionResponseDataSchema,
}).passthrough()
