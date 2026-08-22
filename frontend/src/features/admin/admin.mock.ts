import type { User } from '@/features/admin/user.types'

// TODO: remove this file once the backend returns avatarTone/createdAt.
// The User model has no avatarTone. status is now real (see user.types.ts),
// no longer mocked here. Deterministically derived from _id so it's stable
// across re-renders/refetches instead of jumping around randomly.

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
): T & Pick<User, 'avatarTone'> {
  const hash = hashString(user._id)
  return {
    ...user,
    avatarTone: TONES[hash % TONES.length],
  }
}
