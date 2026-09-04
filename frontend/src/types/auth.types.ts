// Matches the backend's actual API boundary shape (AuthMapper.toResponse,
// used by both POST /auth/login and GET /auth/me) — `id`, not Mongoose's
// internal `_id`. The backend intentionally converts `_id.toString()` to
// `id` at that boundary, so frontend code follows the API contract here.
export interface AuthUser {
  id: string
  email: string
  firstName: string
  lastName: string
  avatar?: { url: string }
}

export interface LoginPayload {
  email: string
  password: string
}
