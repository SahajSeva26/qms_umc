import type { UserRole } from '@/types/auth.types'
import type { User } from '@/types/user.types'
import { INTERNAL_ROLES, PHARMA_ROLES } from '@/lib/roles'

// TODO: remove this file once the backend returns role/avatarTone/createdAt.
// The User model has no role field at all (a user's real access comes from
// its bound Role/RoleType — see features/access-management), and no
// avatarTone. status is now real (see user.types.ts), no longer mocked here.
// Everything here is deterministically derived from _id so it's stable across
// re-renders/refetches instead of jumping around randomly.

const ALL_ROLES: UserRole[] = [...INTERNAL_ROLES, ...PHARMA_ROLES]
const TONES = ['brand', 'teal', 'violet', 'amber', 'emerald', 'rose']

function hashString(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

export function withMockFields<T extends { _id: string }>(
  user: T
): T & Pick<User, 'role' | 'avatarTone'> {
  const hash = hashString(user._id)
  return {
    ...user,
    role: ALL_ROLES[hash % ALL_ROLES.length],
    avatarTone: TONES[hash % TONES.length],
  }
}
