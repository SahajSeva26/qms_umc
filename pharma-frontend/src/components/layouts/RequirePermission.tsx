import { useEffect, useState, type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { SessionRecovery } from '@qms/ui'
import { usePermission } from '@/hooks/usePermission'
import { internalHref } from '@/config/env'

interface RequirePermissionProps {
  anyOf?: string[]
  allOf?: string[]
  children: ReactNode
}

// Mirrors internal-frontend's RequirePermission.tsx — only the unauthenticated redirect differs
// (cross-origin to the shared login, not an in-app route), matching AppLayout.tsx's pattern.
const RequirePermission = ({ anyOf, allOf, children }: RequirePermissionProps) => {
  const { hasAnyPermission, hasAllPermissions, isSettled, isFetching, isError, session, isConfirmedUnauthenticated, refetch } = usePermission()

  // Latches isError (React Query resets it on retry) — gated on !session since a background
  // refetch can fail while a cached session is still served.
  const [sawSessionError, setSawSessionError] = useState(false)
  if (isError && !session && !sawSessionError) setSawSessionError(true)
  if (session && sawSessionError) setSawSessionError(false)

  // In an effect so a temporary session failure (429/5xx) never redirects, only a CONFIRMED 401.
  // Captures the attempted destination as returnTo — same fix as AppLayout.tsx's own redirect.
  useEffect(() => {
    if (isConfirmedUnauthenticated) {
      const attempted = `${window.location.pathname}${window.location.search}${window.location.hash}`
      window.location.href = internalHref(`/auth/login?returnTo=${encodeURIComponent(attempted)}`)
    }
  }, [isConfirmedUnauthenticated])

  // Lifetime flag (stays true through later refetches) — only blocks the very first check.
  if (!isSettled) return null

  // Only a confirmed 401 means "not actually logged in".
  if (isConfirmedUnauthenticated) return null

  // Inconclusive failure (429, network blip, 5xx) is not proof of logout — show retry instead.
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
