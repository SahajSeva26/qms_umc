import { Suspense, useState } from 'react'
import { Outlet, Navigate, useLocation } from 'react-router-dom'
import { useSession } from '@/hooks/useSession'
import { AUTH_ROUTES } from '@/features/auth/auth.routes'
import { getPharmaRoleMeta } from '@/features/pharma/pharma.constants'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import RouteFallback from './RouteFallback'
import SessionLoading from './SessionLoading'
import SessionRecovery from './SessionRecovery'
import FeedbackWidget from '@/features/qa-feedback/components/FeedbackWidget'

const SB_INTENT_KEY = 'qms.sb.intent'

function getInitialCollapsed(): boolean {
  try { return localStorage.getItem(SB_INTENT_KEY) === 'collapsed' }
  catch { return false }
}

function saveCollapsedIntent(next: boolean) {
  try { localStorage.setItem(SB_INTENT_KEY, next ? 'collapsed' : 'expanded') }
  catch { /* cosmetic-only state, ok to silently skip */ }
}

const AppLayout = () => {
  const {
    session,
    isFetching: isSessionFetching,
    isError: isSessionError,
    isConfirmedUnauthenticated,
    refetchSession,
  } = useSession()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(getInitialCollapsed)
  const [mobileOpen, setMobileOpen] = useState(false)

  // Latches isSessionError since React Query resets it the instant a retry
  // starts; gated on !session so Zustand's looser isAuthenticated can't mask a login-time 429/5xx.
  const [sawSessionError, setSawSessionError] = useState(false)
  if (isSessionError && !session && !sawSessionError) setSawSessionError(true)
  if (session && sawSessionError) setSawSessionError(false)

  const handleToggle = () => {
    setCollapsed((prev) => {
      const next = !prev
      saveCollapsedIntent(next)
      return next
    })
  }

  // Keyed off `session` itself, never Zustand's looser `isAuthenticated`,
  // which can be true while `session` is still null right after a fresh login.
  if (!session) {
    // GET /auth/me shares a rate limiter with login/refresh, so a 429 must not read as an invalid session.
    if (isConfirmedUnauthenticated) return <Navigate to={AUTH_ROUTES.LOGIN} replace />

    if (sawSessionError) return <SessionRecovery onRetry={refetchSession} pending={isSessionFetching} />

    if (isSessionFetching) return <SessionLoading />

    return <SessionRecovery onRetry={refetchSession} pending={isSessionFetching} />
  }

  // roleType is typed as required, but the backend mapper can emit roleType:
  // null for a role with no type — optional-chain past the frontend type here.
  const pharmaMeta = getPharmaRoleMeta(session.roleType?.code)
  const onPharmaPath = location.pathname === '/pharma' || location.pathname.startsWith('/pharma/')
  if (pharmaMeta && !onPharmaPath) {
    return <Navigate to={pharmaMeta.portalPath} replace />
  }
  if (!pharmaMeta && onPharmaPath) {
    return <Navigate to="/unauthorized" replace />
  }

  return (
    <div className="app-bg flex h-dvh overflow-hidden">
      <div className="hidden lg:flex shrink-0">
        <Sidebar collapsed={collapsed} onToggle={handleToggle} />
      </div>

      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 lg:hidden">
            <Sidebar collapsed={false} onToggle={() => setMobileOpen(false)} />
          </div>
        </>
      )}

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar onMobileMenuToggle={() => setMobileOpen((v) => !v)} />
        <main className="flex-1 overflow-auto p-6">
          <Suspense fallback={<RouteFallback />}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      <FeedbackWidget />
    </div>
  )
}

export default AppLayout
