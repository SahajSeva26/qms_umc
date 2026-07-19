import type { UserRole } from '@/types/auth.types'

// Matches backend/src/modules/user/user.constants.ts's USER_STATUS — the
// User model's real status, returned by GET /users for callers with
// system:manage (see user.mapper.ts).
export type UserStatus = 'active' | 'inactive' | 'suspended' | 'deleted'

export interface User {
  _id: string
  email: string
  firstName: string
  lastName: string
  status: UserStatus
  // TODO: backend User model has no role field at all (a User's access comes
  // from its bound Role/RoleType — see access-management) and no avatarTone —
  // these are mock-filled in admin.mock.ts. Do not treat as real data.
  role: UserRole
  avatarTone: string
  createdAt?: string
}

export interface UpdateUserPayload {
  // Matches backend UpdateUserPayloadSchema (user.validators.ts): all three
  // fields are optional there too.
  firstName?: string
  lastName?: string
  // Was `boolean` — backend expects the same 4-value status string enum as
  // UserStatus, not a boolean.
  status?: UserStatus
}

export interface SearchUserQuery {
  name?: string
  email?: string
  status?: UserStatus
  page?: number
  limit?: number
}
