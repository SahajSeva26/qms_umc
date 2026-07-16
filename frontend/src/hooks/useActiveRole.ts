import { useSession } from '@/hooks/useSession'
import type { SessionRole } from '@/types/accessManagement.types'

// Enforces the product rule "strictly one active Role per user" as a
// FRONTEND-ENFORCED invariant. Confirmed against the real backend: there is
// NO uniqueness constraint on Role.user (role.model.ts's only unique index is
// (tenant, code)), so the backend does not — and cannot be relied on to —
// guarantee a user has exactly one Role. GET /auth/me as it exists today
// returns a single `role` object, not an array, so this hook's "multiple
// roles" branch is defensive-only and should not occur in practice.
//
// Reads off the central `useSession()` hook rather than running its own
// query, so calling this alongside `usePermission()`/`useSession()` in the
// same tree never triggers a duplicate network request.

/**
 * Defensive typing for a session payload that (contrary to the current,
 * confirmed single-object contract) might someday carry more than one role.
 * Not used by the real backend response today — exists so a future
 * regression is caught by the type system instead of silently assuming an
 * array shape.
 */
export type ActiveRoleSource = SessionRole | SessionRole[]

export interface UseActiveRoleResult {
  /** The user's single resolved active role, or null while loading / if no session. */
  role: SessionRole | null
  /**
   * True if the raw session data ever carried more than one role for this
   * user. There is no UI for this edge case yet — when true, the first role
   * was used and a console.error was already logged.
   */
  hasMultipleRolesError: boolean
  isLoading: boolean
  isError: boolean
}

function resolveActiveRole(source: ActiveRoleSource | null | undefined): {
  role: SessionRole | null
  hasMultipleRolesError: boolean
} {
  if (!source) return { role: null, hasMultipleRolesError: false }

  if (!Array.isArray(source)) {
    return { role: source, hasMultipleRolesError: false }
  }

  // Defensive branch: should not happen given confirmed backend behavior
  // (GET /auth/me returns one `role` object). If it ever does, treat it as
  // an error state rather than silently picking one.
  if (source.length > 1) {
    console.error(
      `[useActiveRole] Expected exactly one active Role per user, but the session returned ${source.length}. ` +
        'Falling back to the first role. This indicates a backend or session-shape regression — ' +
        'there is no UI for this edge case yet.'
    )
  }

  return { role: source[0] ?? null, hasMultipleRolesError: source.length > 1 }
}

export const useActiveRole = (): UseActiveRoleResult => {
  const { session, isLoading, isError } = useSession()

  const rawRole = session?.role as ActiveRoleSource | undefined
  const { role, hasMultipleRolesError } = resolveActiveRole(rawRole)

  return {
    role,
    hasMultipleRolesError,
    isLoading,
    isError,
  }
}
