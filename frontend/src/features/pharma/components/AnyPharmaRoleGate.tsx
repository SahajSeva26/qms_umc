import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useSession } from '@/hooks/useSession'

interface AnyPharmaRoleGateProps {
  children: ReactNode
}

const PHARMA_ROLE_TYPE_CODES = ['pharma-division-head', 'pharma-rsm', 'pharma-asm', 'pharma-mr']

// Sibling to PharmaRoleGate.tsx, for routes reachable by direct URL/deep
// link rather than funneled through one of the 4 role-specific portal pages
// (each already wrapped in its own exact-match PharmaRoleGate). All 4 pharma
// role types share one identical permission (camp:book) — a route-level
// lazyRoute(['camp:book']) check alone can't tell a real pharma session from
// some other role type that happens to also hold that permission, so this
// gate checks session.roleType.code against the full recognized set instead
// of one exact code. Must always wrap a SEPARATE content component, never
// sit beside data-fetching hooks in the same component body — see
// PharmaProjectCampsPage.tsx's comment for why.
const AnyPharmaRoleGate = ({ children }: AnyPharmaRoleGateProps) => {
  const { isSettled, isConfirmedUnauthenticated, session } = useSession()

  if (!isSettled) {
    return <div className="text-[13px] py-10 text-center" style={{ color: 'var(--qms-text-muted)' }}>Loading…</div>
  }
  if (isConfirmedUnauthenticated) return <Navigate to="/login" replace />

  if (!session || !PHARMA_ROLE_TYPE_CODES.includes(session.roleType.code)) {
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
