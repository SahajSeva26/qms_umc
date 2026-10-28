import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { RouteFallback, SessionLoading, SessionRecovery } from '@qms/ui'
import { useSession } from '@/hooks/useSession'
import Sidebar from '@/components/layouts/Sidebar'
import Topbar from '@/components/layouts/Topbar'
import ENV from '@/config/env'

// Lazy: @base-ui/react/dialog only needs to be fetched once the hamburger is actually pressed,
// not on every page's initial load (it was previously eager here, adding ~37kB gzip to the
// always-shipped shell for a drawer most visits never open).
const MobileNavDrawer = lazy(() => import('@/components/layouts/MobileNavDrawer'))

// Owns exactly what every authenticated route needs regardless of content: session resolution,
// loading, inconclusive-failure recovery, plus the shared Sidebar/Topbar shell.
const MOBILE_SIDEBAR_ID = 'pharma-mobile-sidebar'

// Matches Tailwind's default `lg` breakpoint — the same one the drawer's own `lg:hidden` and the
// desktop Sidebar's `hidden lg:flex` key off. Kept in sync with those classes, not derived from
// them, since Tailwind's breakpoints aren't readable at runtime.
const DESKTOP_BREAKPOINT_QUERY = '(min-width: 1024px)'

const AppLayout = () => {
  const {
    session,
    isFetching: isSessionFetching,
    isError: isSessionError,
    isConfirmedUnauthenticated,
    refetchSession,
  } = useSession()

  const [mobileOpen, setMobileOpen] = useState(false)
  // Deferred mount: the drawer's lazy chunk is only fetched on the FIRST open, but once that
  // happens it stays mounted (controlled via `open`) so base-ui's own closing animation/backdrop
  // fade can still play — unmounting immediately on close would cut that animation short.
  const [mobileDrawerMounted, setMobileDrawerMounted] = useState(false)
  // Topbar's hamburger button lives in a sibling component, not this Dialog's own Trigger slot
  // (it's controlled externally — see the `open={mobileOpen}` below) — passed down so base-ui's
  // own finalFocus can return focus to it on close, the same way SideDrawer.tsx gets focus-trap/
  // Escape/finalFocus for free from this same primitive.
  const mobileMenuToggleRef = useRef<HTMLButtonElement>(null)

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

  // CSS alone (`lg:hidden` on the drawer, `hidden lg:flex` on the desktop Sidebar) only hides the
  // mobile drawer visually once the viewport crosses into desktop width — it stays logically open
  // and, being a real base-ui Dialog, keeps focus-trapping/blocking the page underneath via an
  // invisible backdrop. Close it in state whenever the breakpoint is crossed so it's actually
  // closed, not just hidden.
  useEffect(() => {
    const mql = window.matchMedia(DESKTOP_BREAKPOINT_QUERY)
    const handleChange = (e: MediaQueryListEvent) => {
      if (e.matches) setMobileOpen(false)
    }
    mql.addEventListener('change', handleChange)
    return () => mql.removeEventListener('change', handleChange)
  }, [])

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

      {/* Mounted only once opened at least once — avoids fetching @base-ui/react/dialog (and
          rendering a second Sidebar) on every page load for a drawer most visits never open. */}
      {mobileDrawerMounted && (
        <Suspense fallback={null}>
          <MobileNavDrawer
            open={mobileOpen}
            onOpenChange={setMobileOpen}
            finalFocusRef={mobileMenuToggleRef}
            id={MOBILE_SIDEBAR_ID}
          />
        </Suspense>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar
          mobileMenuOpen={mobileOpen}
          onMobileMenuToggle={() => {
            setMobileDrawerMounted(true)
            setMobileOpen((v) => !v)
          }}
          mobileMenuToggleRef={mobileMenuToggleRef}
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
