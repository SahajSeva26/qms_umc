import { Suspense, useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { RouteFallback, SessionLoading, SessionRecovery } from '@qms/ui'
import { useSession } from '@/hooks/useSession'
import ENV from '@/config/env'

// Minimal authenticated shell for this scaffolding step — no sidebar/topbar
// yet (that's real page-by-page work, built alongside the first MR-portal
// tab). Owns exactly what every authenticated route needs regardless of
// content: session resolution, loading, and inconclusive-failure recovery.
const AppLayout = () => {
  const {
    session,
    isFetching: isSessionFetching,
    isError: isSessionError,
    isConfirmedUnauthenticated,
    refetchSession,
  } = useSession()

  // Latches isSessionError since React Query resets it the instant a retry
  // starts; gated on !session so a looser isAuthenticated flag (were one
  // introduced later) can't mask a login-time 429/5xx. Mirrors
  // internal-frontend's own AppLayout.tsx exactly.
  const [sawSessionError, setSawSessionError] = useState(false)
  if (isSessionError && !session && !sawSessionError) setSawSessionError(true)
  if (session && sawSessionError) setSawSessionError(false)

  // No login page lives in this app — the shared login is hosted at the
  // internal app's origin (see the Decided login note in
  // md-files/FRONTEND_SPLIT_ARCHITECTURE.md §5). A cross-origin navigation,
  // not an in-app route — kept in an effect (not inline during render) so a
  // temporary session failure (429/5xx) never redirects, only a CONFIRMED 401.
  useEffect(() => {
    if (isConfirmedUnauthenticated) {
      window.location.href = `${ENV.Hosts.InternalOrigin}/auth/login`
    }
  }, [isConfirmedUnauthenticated])

  if (!session) {
    if (isConfirmedUnauthenticated) return null

    if (sawSessionError) return <SessionRecovery onRetry={refetchSession} pending={isSessionFetching} />

    if (isSessionFetching) return <SessionLoading />

    return <SessionRecovery onRetry={refetchSession} pending={isSessionFetching} />
  }

  return (
    <div className="app-bg flex h-dvh overflow-hidden">
      <main className="flex-1 overflow-auto p-6">
        <Suspense fallback={<RouteFallback />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  )
}

export default AppLayout
