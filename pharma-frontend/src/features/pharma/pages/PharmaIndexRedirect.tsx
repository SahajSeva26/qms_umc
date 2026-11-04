import { Navigate } from 'react-router-dom'
import { useSession } from '@/hooks/useSession'
import { getPharmaRoleMeta, PHARMA_ROUTES } from '@/features/pharma/pharma.constants'

// Index route (`/`) — sends each session straight to its own role's portal path, so every
// pharma role lands on its real dashboard without needing to know its own URL. A role this
// app has no meta for (non-pharma, or session not yet settled) falls back to the MR path,
// where PharmaRoleGate takes over and shows its own-role check / loading state.
const PharmaIndexRedirect = () => {
  const { isSettled, session } = useSession()

  if (!isSettled) {
    return <div className="text-[13px] py-10 text-center" style={{ color: 'var(--qms-text-muted)' }}>Loading…</div>
  }

  const meta = getPharmaRoleMeta(session?.roleType?.code)
  return <Navigate to={meta?.portalPath ?? PHARMA_ROUTES.PHARMA_MR} replace />
}

export default PharmaIndexRedirect
