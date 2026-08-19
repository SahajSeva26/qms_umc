import { useState, type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { usePermission } from '@/hooks/usePermission'
import { AUTH_ROUTES } from '@/features/auth/auth.routes'
import SessionRecovery from './SessionRecovery'

interface RequirePermissionProps {
  anyOf?: string[]
  allOf?: string[]
  children: ReactNode
}

const RequirePermission = ({ anyOf, allOf, children }: RequirePermissionProps) => {
  const { hasAnyPermission, hasAllPermissions, isSettled, isFetching, isError, session, isConfirmedUnauthenticated, refetch } = usePermission()

  // Latches isError because React Query resets it to false the instant a
  // retry starts. Gated on !session in both directions since a background
  // refetch can fail while a cached session is still served.
  const [sawSessionError, setSawSessionError] = useState(false)
  if (isError && !session && !sawSessionError) setSawSessionError(true)
  if (session && sawSessionError) setSawSessionError(false)

  // isSettled is a lifetime flag (stays true through later refetches), so
  // this only blocks the very first check.
  if (!isSettled) return null

  // Only a confirmed 401 means "not actually logged in".
  if (isConfirmedUnauthenticated) {
    return <Navigate to={AUTH_ROUTES.LOGIN} replace />
  }

  // Inconclusive failure (429, network blip, 5xx) is not proof of logout —
  // show a retry UI instead of guessing.
  if (sawSessionError && !session) {
    return <SessionRecovery onRetry={refetch} pending={isFetching} />
  }

  const isAllowed = allOf
    ? hasAllPermissions(allOf)
    : hasAnyPermission(anyOf ?? [])

  if (!isAllowed) {
    return <Navigate to="/unauthorized" replace />
  }

  return <>{children}</>
}

export default RequirePermission
