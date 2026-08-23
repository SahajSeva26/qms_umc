import { useEffect, type ReactNode } from 'react'
import { useSession } from '@/hooks/useSession'
import { useAuthStore } from '@/features/auth/store'

// Restores the session on a hard page reload/first load. Without this,
// useAuthStore.user always starts as null (it's plain in-memory Zustand,
// no persist middleware), so AppLayout's isAuthenticated check bounces to
// login on every refresh even though the httpOnly access/refresh cookies
// are still valid — a real, previously-known gap (see PROGRESS.md's
// "No session restore on page refresh" issue).
//
// Renders children UNCONDITIONALLY — this does NOT gate/block the router
// while the session check is in flight. An earlier version rendered null
// until isLoading resolved, which caused a genuine infinite loop: gating
// children unmounted the whole subtree (including LoginPage, which itself
// observes the same ['session'] query via useLogin's useSession() call),
// so every time the query errored and children remounted, the newly-
// mounted observer's fresh isLoading:true flipped the gate back off,
// unmounting again, forever. AppLayout's existing isAuthenticated check
// already handles "don't show protected content before we know who's
// logged in" correctly on its own — this component only needs to populate
// the store once the check resolves, not block rendering.

const SessionBootstrap = ({ children }: { children: ReactNode }) => {
  const { session, isLoading, isConfirmedUnauthenticated } = useSession()
  const { user, setAuth, clearAuth } = useAuthStore()

  useEffect(() => {
    if (isLoading) return

    if (session && !user) {
      setAuth({
        id: session.user.id,
        email: session.user.email,
        firstName: session.user.firstName,
        lastName: session.user.lastName,
        avatar: session.user.avatar,
      })
    }

    // Only tear down a previously-restored/logged-in user's store entry once
    // the backend has ACTUALLY confirmed they're unauthenticated (a real 401
    // on GET /auth/me) — not merely because this fetch attempt failed for
    // some other reason. GET /auth/me shares the same rate limiter as
    // /auth/login and /auth/refresh-token (rateLimiter.ts), so a burst of
    // requests can 429 it even for a perfectly valid, still-logged-in
    // session; treating that identically to "both tokens expired" was a
    // real bug found live — it silently logged out a valid user purely
    // because of unrelated rate-limiter traffic.
    if (isConfirmedUnauthenticated && user) {
      clearAuth()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, session, isConfirmedUnauthenticated])

  return <>{children}</>
}

export default SessionBootstrap
