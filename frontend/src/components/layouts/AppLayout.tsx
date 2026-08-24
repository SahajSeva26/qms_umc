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

  // Latches isSessionError because React Query resets it to false the instant
  // a retry starts. Gated on !session (not the looser Zustand-or-session
  // isAuthenticated) so a login-time 429/5xx is never masked by Zustand
  // already claiming authenticated before /auth/me has actually resolved.
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

  // Full session lifecycle, all keyed off `session` itself — never the looser
  // Zustand-or-session `isAuthenticated`, which can be true while `session`
  // is still null (fresh login, /auth/me not yet resolved). Nothing below
  // this block may run a pharma-vs-QMS routing decision without a real session.
  if (!session) {
    // Only redirect on a confirmed 401 — GET /auth/me shares a rate limiter
    // with login/refresh, so a 429 does not mean the session is invalid.
    if (isConfirmedUnauthenticated) return <Navigate to={AUTH_ROUTES.LOGIN} replace />

    // Settled but inconclusive (429, network blip, 5xx) — show retry UI
    // rather than rendering null forever.
    if (sawSessionError) return <SessionRecovery onRetry={refetchSession} pending={isSessionFetching} />

    // Only relevant on the very first render after a hard reload.
    if (isSessionFetching) return <SessionLoading />

    // Settled, no session, none of the above matched — never fall through to
    // a blank screen or into the routing decision below with a null session.
    return <SessionRecovery onRetry={refetchSession} pending={isSessionFetching} />
  }

  // session is guaranteed non-null below this point. roleType itself is
  // typed as required but the backend mapper can emit roleType: null for a
  // role with no type — optional-chain past the frontend type here.
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
      {/* Desktop sidebar */}
      <div className="hidden lg:flex shrink-0">
        <Sidebar collapsed={collapsed} onToggle={handleToggle} />
      </div>

      {/* Mobile sidebar overlay */}
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

      {/* Main column */}
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
