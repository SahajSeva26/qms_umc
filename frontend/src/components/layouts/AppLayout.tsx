import { useState } from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useSession } from '@/hooks/useSession'
import { AUTH_ROUTES } from '@/features/auth/auth.routes'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import FeedbackWidget from '@/features/qa-feedback/components/FeedbackWidget'

const SB_INTENT_KEY = 'qms.sb.intent'


function getInitialCollapsed(): boolean {
  return localStorage.getItem(SB_INTENT_KEY) === 'collapsed'
}

const AppLayout = () => {
  const { isAuthenticated: isStoreAuthenticated } = useAuth()
  
  const {
    isAuthenticated: isSessionAuthenticated,
    isFetching: isSessionFetching,
    isConfirmedUnauthenticated,
  } = useSession()
  const isAuthenticated = isStoreAuthenticated || isSessionAuthenticated
  const [collapsed, setCollapsed] = useState(getInitialCollapsed)
  const [mobileOpen, setMobileOpen] = useState(false)

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

  // GET /auth/me shares the same rate limiter as /auth/login and
  // /auth/refresh-token (rateLimiter.ts, mounted on all of /api/v1/auth/*),
  // so a burst of requests can make it come back 429 even for a perfectly
  // valid, still-logged-in session — found live: this hard-redirected a
  // genuinely authenticated user to /login purely because of rate-limiter
  // traffic, not because their session was actually invalid. Only redirect
  // when the backend has ACTUALLY confirmed the caller is unauthenticated
  // (a real 401); any other failure just renders nothing for this pass and
  // lets react-query's own retry (useSession.ts's retry policy) resolve it,
  // rather than forcing a login screen on a session that may still be fine.
  if (!isAuthenticated && !isConfirmedUnauthenticated) return null

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
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>

      <FeedbackWidget />
    </div>
  )
}

export default AppLayout
