import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/features/auth/store'
import { AUTH_ROUTES } from '@/features/auth/auth.routes'
import { INTERNAL_ROLES, PHARMA_ROLES } from '@/lib/roles'
import { useSession } from '@/hooks/useSession'
import type { UserRole } from '@/types/auth.types'

export const useAuth = () => {
  const { user, clearAuth } = useAuthStore()
  const { clearSession } = useSession()
  const navigate = useNavigate()

  const isAuthenticated = !!user

  const hasRole = (...roles: UserRole[]) => {
    if (!user) return false
    return roles.includes(user.role)
  }

  const isQmsInternal = () => !!user && (INTERNAL_ROLES as readonly string[]).includes(user.role)
  const isPharma      = () => !!user && (PHARMA_ROLES  as readonly string[]).includes(user.role)

  const signOut = () => {
    clearAuth()
    // Clear the cached session (useSession/usePermission/useActiveRole)
    // immediately, so a subsequent login by a different user never briefly
    // shows the previous user's stale permissions before the query refetches.
    clearSession()
    navigate(AUTH_ROUTES.LOGIN, { replace: true })
  }

  return { user, isAuthenticated, hasRole, isQmsInternal, isPharma, signOut }
}
