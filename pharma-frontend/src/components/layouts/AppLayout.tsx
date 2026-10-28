import { Suspense } from 'react'
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

  if (!session) {
    // No login page lives in this app — the shared login is hosted at the
    // internal app's origin (see the Decided login note in
    // md-files/FRONTEND_SPLIT_ARCHITECTURE.md §5). A real cross-origin
    // navigation, not an in-app route.
    if (isConfirmedUnauthenticated) {
      window.location.href = `${ENV.Hosts.InternalOrigin}/auth/login`
      return null
    }

    if (isSessionError) {
      return <SessionRecovery onRetry={refetchSession} pending={isSessionFetching} />
    }

    return <SessionLoading />
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
