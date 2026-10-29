import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { useSession } from '@/hooks/useSession'
import { internalHref } from '@/config/env'

interface PharmaRoleGateProps {
  /** The pharma role-type code(s) this page is for (see roleType.constants.ts). */
  roleTypeCode: string | string[]
  children: ReactNode
}

// Waits for session to settle before deciding role (avoids a flash of the wrong portal).
// isConfirmedUnauthenticated here is a defensive backstop — AppLayout.tsx already blocks on session.
const PharmaRoleGate = ({ roleTypeCode, children }: PharmaRoleGateProps) => {
  const { isSettled, isConfirmedUnauthenticated, session } = useSession()

  useEffect(() => {
    if (isConfirmedUnauthenticated) {
      const attempted = `${window.location.pathname}${window.location.search}${window.location.hash}`
      window.location.href = internalHref(`/auth/login?returnTo=${encodeURIComponent(attempted)}`)
    }
  }, [isConfirmedUnauthenticated])

  if (!isSettled) {
    return <div className="text-[13px] py-10 text-center" style={{ color: 'var(--qms-text-muted)' }}>Loading…</div>
  }
  if (isConfirmedUnauthenticated) return null

  const allowedCodes = Array.isArray(roleTypeCode) ? roleTypeCode : [roleTypeCode]
  if (!session?.roleType?.code || !allowedCodes.includes(session.roleType.code)) {
    // A real cross-role deep link (e.g. an MR session opening /pharma/ho directly) — the index
    // redirect sends each role to its own path, but a direct URL hit must still be blocked here.
    return (
      <div className="w-full">
        <div className="rounded-lg border p-6 text-center" style={{ borderColor: 'var(--qms-border)' }}>
          <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--qms-text)' }}>Not available for your role</h2>
          <p className="text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>
            This portal isn't available for your role.
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

export default PharmaRoleGate
