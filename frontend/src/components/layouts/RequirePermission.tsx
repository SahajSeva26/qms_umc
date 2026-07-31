import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { usePermission } from '@/hooks/usePermission'

interface RequirePermissionProps {
  anyOf?: string[]
  allOf?: string[]
  children: ReactNode
}

const RequirePermission = ({ anyOf, allOf, children }: RequirePermissionProps) => {
  const { hasAnyPermission, hasAllPermissions, isSettled } = usePermission()

  if (!isSettled) return null

  const isAllowed = allOf
    ? hasAllPermissions(allOf)
    : hasAnyPermission(anyOf ?? [])

  if (!isAllowed) {
    return <Navigate to="/unauthorized" replace />
  }

  return <>{children}</>
}

export default RequirePermission
