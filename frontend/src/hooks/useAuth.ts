import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/features/auth/store'
import { AUTH_ROUTES } from '@/features/auth/auth.routes'
import { INTERNAL_ROLES, PHARMA_ROLES } from '@/lib/roles'
import type { UserRole } from '@/types/auth.types'

export const useAuth = () => {
  const { user, clearAuth } = useAuthStore()
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
    navigate(AUTH_ROUTES.LOGIN, { replace: true })
  }

  return { user, isAuthenticated, hasRole, isQmsInternal, isPharma, signOut }
}
