import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useSession } from '@/hooks/useSession'
import { PHARMA_ROLE_TYPE_CODES } from '@/features/pharma/pharma.constants'

interface AnyPharmaRoleGateProps {
  children: ReactNode
}

// All 4 pharma role types share one permission (camp:book), so a route-level
// permission check alone can't tell them apart from another role type that also holds it.
const AnyPharmaRoleGate = ({ children }: AnyPharmaRoleGateProps) => {
  const { isSettled, isConfirmedUnauthenticated, session } = useSession()

  if (!isSettled) {
    return <div className="text-[13px] py-10 text-center" style={{ color: 'var(--qms-text-muted)' }}>Loading…</div>
  }
  if (isConfirmedUnauthenticated) return <Navigate to="/login" replace />

  if (!session?.roleType || !PHARMA_ROLE_TYPE_CODES.includes(session.roleType.code)) {
    return (
      <div className="w-full">
        <div className="rounded-lg border p-6 text-center" style={{ borderColor: 'var(--qms-border)' }}>
          <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--qms-text)' }}>Not available for your role</h2>
          <p className="text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>
            This page is only for pharma HO, RSM, ASM, and MR roles.
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

export default AnyPharmaRoleGate
