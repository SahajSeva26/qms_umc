// Matches the backend's API boundary shape (AuthMapper.toResponse) — `id`,
// not Mongoose's internal `_id`.
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
