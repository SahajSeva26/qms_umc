import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { useSession } from '@/hooks/useSession'
import ENV from '@/config/env'

interface PharmaRoleGateProps {
  /** The one pharma role-type code this page is for (see roleType.constants.ts). */
  roleTypeCode: string
  children: ReactNode
}

// Waits for session to settle before deciding role (avoids a flash of the wrong portal).
// isConfirmedUnauthenticated here is a defensive backstop — AppLayout.tsx already blocks on session.
const PharmaRoleGate = ({ roleTypeCode, children }: PharmaRoleGateProps) => {
  const { isSettled, isConfirmedUnauthenticated, session } = useSession()

  useEffect(() => {
    if (isConfirmedUnauthenticated) {
      window.location.href = `${ENV.Hosts.InternalOrigin}/auth/login`
    }
  }, [isConfirmedUnauthenticated])

  if (!isSettled) {
    return <div className="text-[13px] py-10 text-center" style={{ color: 'var(--qms-text-muted)' }}>Loading…</div>
  }
  if (isConfirmedUnauthenticated) return null

  if (session?.roleType?.code !== roleTypeCode) {
    // A real cross-role deep link (e.g. ASM opening /pharma/mr) — only MR has a page
    // behind it today, so any other pharma role has nowhere real to land yet.
    return (
      <div className="w-full">
        <div className="rounded-lg border p-6 text-center" style={{ borderColor: 'var(--qms-border)' }}>
          <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--qms-text)' }}>Not available for your role</h2>
          <p className="text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>
            This portal is only for pharma MR right now. HO, RSM, and ASM are coming soon.
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

export default PharmaRoleGate
