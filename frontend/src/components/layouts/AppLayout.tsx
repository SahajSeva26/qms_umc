import { useState, useEffect } from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useSession } from '@/hooks/useSession'
import { AUTH_ROUTES } from '@/features/auth/auth.routes'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import FeedbackWidget from '@/features/qa-feedback/components/FeedbackWidget'

const SB_INTENT_KEY = 'qms.sb.intent'
const SB_SMALL_MQ = '(max-width: 1280px)'

function getInitialCollapsed(): boolean {
  const intent = localStorage.getItem(SB_INTENT_KEY)
  if (intent === 'collapsed') return true
  if (intent === 'expanded') return false
  return window.matchMedia(SB_SMALL_MQ).matches
}

const AppLayout = () => {
  const { isAuthenticated: isStoreAuthenticated } = useAuth()
  // On a hard page reload, useAuthStore.user starts null (no persist
  // middleware) even though the httpOnly session cookie may still be
  // valid. SessionBootstrap (app/SessionBootstrap.tsx) restores the store
  // from the real session via a useEffect — but that effect only runs
  // AFTER the render that resolved the session data commits, and this
  // component's OWN render (reading the store) can happen in that same
  // window, before the effect has fired. Waiting on isLoading/isFetching
  // alone doesn't close that window either, since by the time
  // SessionBootstrap's effect actually runs, the query itself has already
  // finished (isFetching already false) — so this component must check
  // useSession()'s OWN isAuthenticated/session directly (derived straight
  // from query data at render time, no effect-timing dependency) rather
  // than solely trusting the store, which can lag behind by exactly one
  // effect-flush. The store is still the source of truth everywhere else
  // (useAuth's other consumers, hasRole, etc.) — this is only a
  // same-render fallback so a valid session is never treated as logged-out
  // for the single render before the store catches up.
  const { isAuthenticated: isSessionAuthenticated, isFetching: isSessionFetching } = useSession()
  const isAuthenticated = isStoreAuthenticated || isSessionAuthenticated
  const [collapsed, setCollapsed] = useState(getInitialCollapsed)
  const [mobileOpen, setMobileOpen] = useState(false)

  // Auto-collapse/expand when crossing 1280px breakpoint, unless user has a saved intent
  useEffect(() => {
    const mql = window.matchMedia(SB_SMALL_MQ)
    const onChange = (e: MediaQueryListEvent) => {
      const intent = localStorage.getItem(SB_INTENT_KEY)
      if (!intent) setCollapsed(e.matches)
    }
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  const handleToggle = () => {
    setCollapsed((prev) => {
      const next = !prev
      localStorage.setItem(SB_INTENT_KEY, next ? 'collapsed' : 'expanded')
      return next
    })
  }

  // Don't decide "not authenticated, redirect" until we've had a chance to
  // restore a valid session from the cookie — only relevant on the very
  // first render after a hard reload (isAuthenticated is already true on
  // every subsequent client-side navigation, so this never blocks normal use).
  if (!isAuthenticated && isSessionFetching) return null

  if (!isAuthenticated) return <Navigate to={AUTH_ROUTES.LOGIN} replace />

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
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>

      <FeedbackWidget />
    </div>
  )
}

export default AppLayout
