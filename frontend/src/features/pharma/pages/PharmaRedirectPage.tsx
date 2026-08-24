import { Navigate } from 'react-router-dom'
import { useSession } from '@/hooks/useSession'
import { getPharmaRoleMeta } from '@/features/pharma/pharma.constants'

// The single nav entry always points here, so nav config never has to know role types.
const PharmaRedirectPage = () => {
  const { isSettled, isConfirmedUnauthenticated, session } = useSession()

  if (!isSettled) {
    return <div className="text-[13px] py-10 text-center" style={{ color: 'var(--qms-text-muted)' }}>Loading…</div>
  }
  if (isConfirmedUnauthenticated) return <Navigate to="/login" replace />

  const meta = getPharmaRoleMeta(session?.roleType?.code)
  if (meta) return <Navigate to={meta.portalPath} replace />

  // Defense-in-depth: AppLayout already redirects a non-pharma session away from /pharma before this ever renders.
  return <Navigate to="/unauthorized" replace />
}

export default PharmaRedirectPage
