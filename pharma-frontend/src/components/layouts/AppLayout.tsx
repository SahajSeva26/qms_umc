import { Suspense, useEffect, useRef, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { RouteFallback, SessionLoading, SessionRecovery } from '@qms/ui'
import { useSession } from '@/hooks/useSession'
import Sidebar from '@/components/layouts/Sidebar'
import Topbar from '@/components/layouts/Topbar'
import ENV from '@/config/env'

const MOBILE_SIDEBAR_ID = 'pharma-mobile-sidebar'
const MOBILE_MENU_TOGGLE_ID = 'pharma-mobile-menu-toggle'

// Owns exactly what every authenticated route needs regardless of content: session resolution,
// loading, inconclusive-failure recovery, plus the shared Sidebar/Topbar shell.
const AppLayout = () => {
  const {
    session,
    isFetching: isSessionFetching,
    isError: isSessionError,
    isConfirmedUnauthenticated,
    refetchSession,
  } = useSession()

  const [mobileOpen, setMobileOpen] = useState(false)
  const mobileDrawerRef = useRef<HTMLDivElement>(null)

  // Escape closes the drawer from anywhere; focus moves into the drawer on open and back to the
  // hamburger button that opened it on close, matching native dialog/drawer behavior.
  useEffect(() => {
    if (!mobileOpen) return
    mobileDrawerRef.current?.focus()
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.getElementById(MOBILE_MENU_TOGGLE_ID)?.focus()
    }
  }, [mobileOpen])

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
      <div className="hidden lg:flex shrink-0">
        <Sidebar />
      </div>

      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <div
            id={MOBILE_SIDEBAR_ID}
            ref={mobileDrawerRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            className="fixed inset-y-0 left-0 z-50 lg:hidden outline-none"
          >
            <Sidebar />
          </div>
        </>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar
          mobileMenuOpen={mobileOpen}
          onMobileMenuToggle={() => setMobileOpen((v) => !v)}
          mobileMenuToggleId={MOBILE_MENU_TOGGLE_ID}
          mobileSidebarId={MOBILE_SIDEBAR_ID}
        />
        <main className="flex-1 overflow-auto p-6">
          <Suspense fallback={<RouteFallback />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  )
}

export default AppLayout
