import { Navigate } from 'react-router-dom'
import { useSession } from '@/hooks/useSession'

// Literal paths, not an import from pharma.routes.tsx — that file imports
// this page, so importing back would be circular.
const ROLE_TYPE_TO_ROUTE: Record<string, string> = {
  'pharma-division-head': '/pharma/ho',
  'pharma-rsm': '/pharma/rsm',
  'pharma-asm': '/pharma/asm',
  'pharma-mr': '/pharma/mr',
}

// The single nav entry always points here, so nav config never has to know role types.
const PharmaRedirectPage = () => {
  const { isSettled, isConfirmedUnauthenticated, session } = useSession()

  if (!isSettled) {
    return <div className="text-[13px] py-10 text-center" style={{ color: 'var(--qms-text-muted)' }}>Loading…</div>
  }
  if (isConfirmedUnauthenticated) return <Navigate to="/login" replace />

  const target = session ? ROLE_TYPE_TO_ROUTE[session.roleType.code] : undefined
  if (target) return <Navigate to={target} replace />

  return (
    <div className="w-full">
      <div className="rounded-lg border p-6 text-center" style={{ borderColor: 'var(--qms-border)' }}>
        <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--qms-text)' }}>No pharma portal for your role</h2>
        <p className="text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>
          This area is only for pharma HO, RSM, ASM, and MR roles.
        </p>
      </div>
    </div>
  )
}

export default PharmaRedirectPage
