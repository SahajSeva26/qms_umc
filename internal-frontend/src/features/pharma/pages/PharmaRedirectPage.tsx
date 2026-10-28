import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useSession } from '@/hooks/useSession'
import { getPharmaRoleMeta } from '@/features/pharma/pharma.constants'
import ENV from '@/config/env'

// The single nav entry always points here, so nav config never has to know role types. A pharma
// session is sent to the SEPARATELY-HOSTED pharma-frontend app via a real cross-origin navigation
// (window.location.href) — a real document navigation, not an in-app react-router Navigate, since
// the destination is a different deployed app, not a route this router owns. Internal-frontend's
// own /pharma/* pages (HoPortalPage etc.) are left in place but unreachable via this normal login
// path — see md-files/FRONTEND_SPLIT_ARCHITECTURE.md §5 for what's still unverified (real-domain
// CORS/cookie behavior across the two origins) before this cutover can be trusted in production.
const PharmaRedirectPage = () => {
  const { isSettled, isConfirmedUnauthenticated, session } = useSession()
  const meta = getPharmaRoleMeta(session?.roleType?.code)

  useEffect(() => {
    if (meta) {
      window.location.href = `${ENV.Hosts.PharmaOrigin}${meta.portalPath}`
    }
  }, [meta])

  if (!isSettled) {
    return <div className="text-[13px] py-10 text-center" style={{ color: 'var(--qms-text-muted)' }}>Loading…</div>
  }
  if (isConfirmedUnauthenticated) return <Navigate to="/login" replace />

  if (meta) {
    // The cross-origin navigation above is already in flight — this is only what's briefly on
    // screen while the browser is still loading the new origin.
    return <div className="text-[13px] py-10 text-center" style={{ color: 'var(--qms-text-muted)' }}>Redirecting to your portal…</div>
  }

  // Defense-in-depth: AppLayout already redirects a non-pharma session away from /pharma before this ever renders.
  return <Navigate to="/unauthorized" replace />
}

export default PharmaRedirectPage
