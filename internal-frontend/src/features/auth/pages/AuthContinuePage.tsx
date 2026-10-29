import { useEffect, useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { SessionRecovery } from '@qms/ui'
import { useSession } from '@/hooks/useSession'
import { AUTH_ROUTES } from '@/features/auth/auth.paths'
import { getFirstVisibleNavPath } from '@/lib/navigation/visibleNav'
import { canUseReturnTo, isPharmaBuildPath } from '@/features/auth/returnTo'
import { getPharmaRoleMeta } from '@/features/pharma/pharma.constants'
import { pharmaHref } from '@/config/env'

// The post-login landing target. Consumes the SAME session query useLogin already triggered a
// refetch of — never issues its own GET /auth/me, so there's one authoritative post-login session
// request, not a race between two. If the login URL carried a validated returnTo, that wins;
// otherwise resolves to the first sidebar item this session can actually reach (same shared
// selector Sidebar.tsx renders from), so every role lands somewhere real instead of a hard-coded
// page some roles can't see.
const AuthContinuePage = () => {
  const { isSettled, isFetching, isError, isConfirmedUnauthenticated, session, permissions, refetchSession } = useSession()
  const [searchParams] = useSearchParams()
  const returnTo = searchParams.get('returnTo')

  // Latches isError because React Query resets it to false the instant a retry starts — same
  // pattern RequirePermission.tsx uses, so an inconclusive failure (429/network/5xx) isn't lost
  // the moment a background retry begins.
  const [sawSessionError, setSawSessionError] = useState(false)
  if (isError && !session && !sawSessionError) setSawSessionError(true)
  if (session && sawSessionError) setSawSessionError(false)

  // isSettled is a lifetime flag — it stays true once the query has EVER resolved, even while a
  // later refetch (e.g. the one useLogin triggers right after this page mounts) is still in
  // flight and session is momentarily null/stale. Treat that as still loading, not "no access" —
  // otherwise this flashes "Nothing to show yet" on every login before the real session lands.
  const stillResolving = !isSettled || (!session && isFetching)

  const navSession = session
    ? { isSettled, permissions, roleTypeCode: session.roleType.code, tenantType: session.tenant.type }
    : null

  // getFirstVisibleNavPath's pharma branch resolves to the GENERIC nav item's own path
  // (PHARMA_ROUTES.PHARMA, '/pharma') — not a real page on its own, just the sidebar entry's
  // target. When it picks that item (meaning the portal is genuinely reachable for this session —
  // the function already falls back PAST it, e.g. to Doctor Management, for a misconfigured
  // pharma session that can't reach its own portal), resolve the actual role-specific portal path
  // via getPharmaRoleMeta instead of using the generic placeholder directly.
  const fallbackPath = !stillResolving && !isConfirmedUnauthenticated && navSession ? getFirstVisibleNavPath(navSession) : null
  const fallbackDestination =
    fallbackPath === '/pharma' && session ? (getPharmaRoleMeta(session.roleType.code)?.portalPath ?? fallbackPath) : fallbackPath

  // returnTo is validated ONLY now, against the actual authenticated session — never trusted
  // before this point (the login page/form never checks it, just carries the raw string through).
  const destination =
    navSession && returnTo && canUseReturnTo(navSession, returnTo) ? returnTo : fallbackDestination
  const destinationIsPharmaBuild = !!destination && isPharmaBuildPath(destination)

  // A pharma destination is a DIFFERENT BUILD (not a route this router owns) — reached via a real
  // document navigation (pharmaHref: same-origin relative path in production, cross-port absolute
  // URL in local dev only), never an in-app react-router Navigate. Kept in an effect, not inline
  // during render: a side effect with a real-world consequence (an actual browser navigation) must
  // not run directly in a render body, which React may call more than once for the same commit
  // (Strict Mode double-invoke, concurrent rendering, a discarded render) or not commit at all.
  useEffect(() => {
    if (destinationIsPharmaBuild && destination) {
      window.location.replace(pharmaHref(destination))
    }
  }, [destinationIsPharmaBuild, destination])

  if (stillResolving) return null

  if (isConfirmedUnauthenticated) {
    return <Navigate to={AUTH_ROUTES.LOGIN} replace />
  }

  if (sawSessionError && !session) {
    return <SessionRecovery onRetry={refetchSession} pending={isFetching} />
  }

  if (!destination) {
    return (
      <div className="flex h-dvh w-full items-center justify-center p-6">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-bold mb-2" style={{ color: 'var(--qms-text)' }}>
            Nothing to show yet
          </h1>
          <p className="text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>
            Your account doesn't have access to any page yet. Contact an administrator to get your
            permissions configured.
          </p>
        </div>
      </div>
    )
  }

  if (destinationIsPharmaBuild) {
    // The effect above is already in flight (or has already fired) — this is only what's briefly
    // on screen while the browser is still navigating to the new path.
    return (
      <div className="text-[13px] py-10 text-center" style={{ color: 'var(--qms-text-muted)' }}>
        Redirecting to your portal…
      </div>
    )
  }

  return <Navigate to={destination} replace />
}

export default AuthContinuePage
