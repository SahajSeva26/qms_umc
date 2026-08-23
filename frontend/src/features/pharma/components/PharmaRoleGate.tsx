import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useSession } from '@/hooks/useSession'

interface PharmaRoleGateProps {
  /** The one pharma role-type code this page is for (see roleType.constants.ts). */
  roleTypeCode: string
  children: ReactNode
}

const ROLE_LABELS: Record<string, string> = {
  'pharma-division-head': 'HO',
  'pharma-rsm': 'RSM',
  'pharma-asm': 'ASM',
  'pharma-mr': 'MR',
}

// Shared by all 4 portal pages — never render a role decision before the
// session has actually settled (isSettled), or a slow first /auth/me fetch
// can flash the wrong portal's content for a moment.
const PharmaRoleGate = ({ roleTypeCode, children }: PharmaRoleGateProps) => {
  const { isSettled, isConfirmedUnauthenticated, session } = useSession()

  if (!isSettled) {
    return <div className="text-[13px] py-10 text-center" style={{ color: 'var(--qms-text-muted)' }}>Loading…</div>
  }
  if (isConfirmedUnauthenticated) return <Navigate to="/login" replace />

  if (session?.roleType.code !== roleTypeCode) {
    return (
      <div className="w-full">
        <div className="rounded-lg border p-6 text-center" style={{ borderColor: 'var(--qms-border)' }}>
          <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--qms-text)' }}>Not available for your role</h2>
          <p className="text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>
            This portal is only for {ROLE_LABELS[roleTypeCode] ?? roleTypeCode}. Use the Pharma Portal link to reach your own team's page.
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

export default PharmaRoleGate
