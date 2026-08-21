import { Suspense, useState } from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useSession } from '@/hooks/useSession'
import { AUTH_ROUTES } from '@/features/auth/auth.routes'
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
  const { isAuthenticated: isStoreAuthenticated } = useAuth()
  
  const {
    isAuthenticated: isSessionAuthenticated,
    isFetching: isSessionFetching,
    isError: isSessionError,
    isConfirmedUnauthenticated,
    refetchSession,
  } = useSession()
  const isAuthenticated = isStoreAuthenticated || isSessionAuthenticated
  const [collapsed, setCollapsed] = useState(getInitialCollapsed)
  const [mobileOpen, setMobileOpen] = useState(false)

  // Latches isSessionError because React Query resets it to false the instant
  // a retry starts. Gated on !isAuthenticated in both directions since a
  // background refetch can fail while a cached session is still served.
  const [sawSessionError, setSawSessionError] = useState(false)
  if (isSessionError && !isAuthenticated && !sawSessionError) setSawSessionError(true)
  if (isAuthenticated && sawSessionError) setSawSessionError(false)

  const handleToggle = () => {
    setCollapsed((prev) => {
      const next = !prev
      saveCollapsedIntent(next)
      return next
    })
  }

  // Only redirect on a confirmed 401 — GET /auth/me shares a rate limiter
  // with login/refresh, so a 429 does not mean the session is invalid.
  if (!isAuthenticated && isConfirmedUnauthenticated) {
    return <Navigate to={AUTH_ROUTES.LOGIN} replace />
  }

  // Settled but inconclusive (429, network blip, 5xx) — show retry UI
  // rather than rendering null forever.
  if (!isAuthenticated && sawSessionError) {
    return <SessionRecovery onRetry={refetchSession} pending={isSessionFetching} />
  }

  // Only relevant on the very first render after a hard reload.
  if (!isAuthenticated && isSessionFetching) return <SessionLoading />

  if (!isAuthenticated) return null

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
