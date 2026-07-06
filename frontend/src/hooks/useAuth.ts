import { useAuthStore } from '@/features/auth/store'
import type { UserRole } from '@/types/auth.types'

export const useAuth = () => {
  const { user } = useAuthStore()

  const isAuthenticated = !!user

  const hasRole = (...roles: UserRole[]) => {
    if (!user) return false
    return roles.includes(user.role)
  }

  const isQmsInternal = () => {
    if (!user) return false
    const internalRoles: UserRole[] = [
      'super_admin', 'admin', 'sales_lead', 'sales_rep',
      'camp_coord', 'diet_camp_coord', 'om_screening', 'om_diet',
      'fo', 'dedicated_fo', 'logistics', 'accounts', 'dietitian', 'analytics_viewer',
    ]
    return internalRoles.includes(user.role)
  }

  const isPharma = () => {
    if (!user) return false
    const pharmaRoles: UserRole[] = ['pharma_ho', 'pharma_rsm', 'pharma_asm', 'pharma_mr']
    return pharmaRoles.includes(user.role)
  }

  return { user, isAuthenticated, hasRole, isQmsInternal, isPharma }
}
