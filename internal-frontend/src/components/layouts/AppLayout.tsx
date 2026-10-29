import { Suspense, useEffect, useState } from 'react'
import { Outlet, Navigate, useLocation } from 'react-router-dom'
import { RouteFallback, SessionLoading, SessionRecovery, GoogleMapsProvider } from '@qms/ui'
import { useSession } from '@/hooks/useSession'
import { AUTH_ROUTES } from '@/features/auth/auth.paths'
import { getPharmaRoleMeta } from '@/features/pharma/pharma.constants'
import { PHARMA_FIELD_ROLE_TYPE_CODES } from '@/lib/access/pharmaAccess'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import FeedbackWidget from '@/features/qa-feedback/components/FeedbackWidget'
import ENV, { pharmaHref } from '@/config/env'

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

  // roleType is typed as required, but the backend mapper can emit roleType:
  // null for a role with no type — optional-chain past the frontend type here.
  const pharmaMeta = session ? getPharmaRoleMeta(session.roleType?.code) : null
  // MR/ASM/RSM's exceptions: Camp Management, Diet Camps (exact matches — not /camps/screening,
  // /camps/new, etc.), and Doctor Management.
  const onFieldExtraPath = !!session?.roleType?.code && PHARMA_FIELD_ROLE_TYPE_CODES.includes(session.roleType.code) && (location.pathname === '/camps' || location.pathname === '/camps/diet' || location.pathname === '/doctors')
  const shouldRedirectToPharma = !!pharmaMeta && !onFieldExtraPath

  // A pharma session on any internal-frontend route (this router no longer registers '/pharma/*'
  // at all — the deployment proxy routes that prefix to the separately-deployed pharma build
  // before it ever reaches here) is sent to its own portal via a hard document navigation, not an
  // in-app Navigate — it's a different bundle. pharmaHref: same-origin relative path in
  // production, cross-port absolute URL in local dev only. Kept in an effect, not inline during
  // render: a side effect with a real-world consequence (an actual browser navigation) must not
  // run directly in a render body, which React may call more than once for the same commit
  // (Strict Mode double-invoke, concurrent rendering, a discarded render) or not commit at all.
  useEffect(() => {
    if (shouldRedirectToPharma && pharmaMeta) {
      window.location.replace(pharmaHref(pharmaMeta.portalPath))
    }
  }, [shouldRedirectToPharma, pharmaMeta])

  // Keyed off `session` itself, never Zustand's looser `isAuthenticated`,
  // which can be true while `session` is still null right after a fresh login.
  if (!session) {
    // GET /auth/me shares a rate limiter with login/refresh, so a 429 must not read as an invalid session.
    if (isConfirmedUnauthenticated) {
      // Captures the attempted destination as returnTo (validated later against the now-known
      // session in AuthContinuePage — see features/auth/returnTo.ts) so a cold visit to a deep
      // internal URL isn't lost. Mirrors the api.ts interceptor's own redirectToLogin fix.
      const attempted = `${location.pathname}${location.search}${location.hash}`
      return <Navigate to={`${AUTH_ROUTES.LOGIN}?returnTo=${encodeURIComponent(attempted)}`} replace />
    }

    if (sawSessionError) return <SessionRecovery onRetry={refetchSession} pending={isSessionFetching} />

    if (isSessionFetching) return <SessionLoading />

    return <SessionRecovery onRetry={refetchSession} pending={isSessionFetching} />
  }

  if (shouldRedirectToPharma) {
    // The effect above is already in flight (or has already fired) — this is only what's briefly
    // on screen while the browser is still navigating to the new path.
    return (
      <div className="text-[13px] py-10 text-center" style={{ color: 'var(--qms-text-muted)' }}>
        Redirecting to your portal…
      </div>
    )
  }

  return (
    <GoogleMapsProvider apiKey={ENV.Maps.ApiKey}>
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
    </GoogleMapsProvider>
  )
}

export default AppLayout
