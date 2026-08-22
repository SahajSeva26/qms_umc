export interface AuthUser {
  // `id`, not `_id` — POST /auth/login and GET /auth/me both go through the
  // backend's AuthMapper.toResponse, which maps `user._id` to `id`.
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
