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
//
// role is deliberately left as the 'super_admin' fallback here, same as
// useLogin.ts's existing fallback — there is no honest mapping from the
// backend's real roleType.code vocabulary (system/hr/admin/sales/
// sales-head/pharma-ho/...) to the frontend's invented 18-value UserRole
// enum (super_admin/sales_lead/om_screening/...); the 18-role system was
// always meant to be a placeholder retired once real PBAC existed, and
// migrating the ~30 screens still gated by it off UserRole entirely is a
// separate, larger, explicitly-deferred effort — not something to paper
// over with a fabricated mapping table here.

const SessionBootstrap = ({ children }: { children: ReactNode }) => {
  const { session, isLoading, isError } = useSession()
  const { user, setAuth, clearAuth } = useAuthStore()

  useEffect(() => {
    if (isLoading) return

    if (session && !user) {
      // TODO: same fallback as useLogin.ts/LoginPage.tsx — remove once the
      // backend exposes a real, frontend-compatible role, or once the ~30
      // domain screens migrate off UserRole entirely.
      setAuth({
        _id: session.user.id,
        email: session.user.email,
        firstName: session.user.firstName,
        lastName: session.user.lastName,
        avatar: session.user.avatar,
        role: 'super_admin',
      })
    }

    if ((isError || !session) && user) {
      // A previously-restored/logged-in user's session is no longer valid
      // (e.g. both tokens expired) — clear the stale store rather than
      // leave AppLayout thinking they're still authenticated.
      clearAuth()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, session, isError])

  return <>{children}</>
}

export default SessionBootstrap
