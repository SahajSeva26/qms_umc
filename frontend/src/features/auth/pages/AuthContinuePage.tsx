import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useSession } from '@/hooks/useSession'
import { AUTH_ROUTES } from '@/features/auth/auth.routes'
import SessionRecovery from '@/components/layouts/SessionRecovery'
import { getFirstVisibleNavPath } from '@/lib/navigation/visibleNav'

// The post-login landing target. Consumes the SAME session query useLogin already triggered a
// refetch of — never issues its own GET /auth/me, so there's one authoritative post-login session
// request, not a race between two. Resolves to the first sidebar item this session can actually
// reach (same shared selector Sidebar.tsx renders from), so every role lands somewhere real instead
// of a hard-coded page some roles can't see.
const AuthContinuePage = () => {
  const { isSettled, isFetching, isError, isConfirmedUnauthenticated, session, permissions, refetchSession } = useSession()

  // Latches isError because React Query resets it to false the instant a retry starts — same
  // pattern RequirePermission.tsx uses, so an inconclusive failure (429/network/5xx) isn't lost
  // the moment a background retry begins.
  const [sawSessionError, setSawSessionError] = useState(false)
  if (isError && !session && !sawSessionError) setSawSessionError(true)
  if (session && sawSessionError) setSawSessionError(false)

  if (!isSettled) return null

  if (isConfirmedUnauthenticated) {
    return <Navigate to={AUTH_ROUTES.LOGIN} replace />
  }

  if (sawSessionError && !session) {
    return <SessionRecovery onRetry={refetchSession} pending={isFetching} />
  }

  // isSettled is a lifetime flag — it stays true once the query has EVER resolved, even while a
  // later refetch (e.g. the one useLogin triggers right after this page mounts) is still in
  // flight and session is momentarily null/stale. Treat that as still loading, not "no access" —
  // otherwise this flashes "Nothing to show yet" on every login before the real session lands.
  if (!session && isFetching) return null

  const destination = session
    ? getFirstVisibleNavPath({
        isSettled,
        permissions,
        roleTypeCode: session.roleType.code,
        tenantType: session.tenant.type,
      })
    : null

  if (!destination) {
    return (
      <div className="flex h-dvh w-full items-center justify-center p-6">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-bold mb-2" style={{ color: 'var(--qms-text)' }}>
            Nothing to show yet
          </h1>
          <p className="text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>
            Your account doesn't have access to any page yet. Contact an administrator to get your
            permissions configured.
          </p>
        </div>
      </div>
    )
  }

  return <Navigate to={destination} replace />
}

export default AuthContinuePage
