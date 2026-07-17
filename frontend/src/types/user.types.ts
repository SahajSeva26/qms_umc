import type { UserRole } from '@/types/auth.types'

export type UserStatus = 'active' | 'invited' | 'suspended'

export interface User {
  _id: string
  email: string
  firstName: string
  lastName: string
  // TODO: backend does not return role/status yet (User model has no role field,
  // and the mapper strips status/avatar/createdAt) — these are mock-filled in
  // admin.mock.ts until the backend ships them. Do not treat as real data.
  role: UserRole
  status: UserStatus
  avatarTone: string
  createdAt?: string
}

export interface UpdateUserPayload {
  firstName: string
  lastName?: string
  status?: boolean
}

export interface SearchUserQuery {
  name?: string
  email?: string
  page?: number
  limit?: number
}
