import { z } from 'zod'

// ── Form input validation ────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

export type LoginFormValues = z.infer<typeof loginSchema>

// ── Response contract validation ─────────────────────────────────────────────
// Runtime contract check for POST /auth/login, mirroring the existing
// AuthMeResponseSchema (features/access-management/accessManagement.response-schemas.ts).
// Observe-only via validateApiResponse — it never reshapes the response, it
// only reports a drift between what the backend sends and what AuthUser claims.
//
// This exists because the login response is what the Zustand auth store is
// hydrated from, and it was the ONE auth response with no runtime check —
// which is how the `_id` vs `id` mismatch stayed invisible: the store held a
// user whose id field was undefined until the next full page reload (where
// SessionBootstrap rehydrates from the validated GET /auth/me instead).

// Field-for-field with `AuthUser` (auth.types.ts) — the point of this schema is
// to catch the response drifting away from the type the app codes against.
const LoginUserSchema = z
  .object({
    // The backend's AuthMapper.toResponse returns `id` (from `user._id.toString()`),
    // NOT `_id`. Any future rename server-side must fail loudly here.
    id: z.string(),
    email: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    avatar: z.object({ url: z.string() }).passthrough().optional(),
  })
  .passthrough()

export const LoginResponseSchema = z
  .object({
    // Literal true, not boolean — success: false with data present is itself the mismatch.
    success: z.literal(true),
    message: z.string(),
    // Non-nullable on purpose. ApiResponse<T> permits `data: null`, but a 200
    // login with no user payload leaves the store unpopulated while the UI
    // still treats the login as successful — a contract break worth reporting.
    data: LoginUserSchema,
  })
  .passthrough()
