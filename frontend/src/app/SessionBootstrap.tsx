import { useEffect, type ReactNode } from 'react'
import { useSession } from '@/hooks/useSession'
import { useAuthStore } from '@/features/auth/store'

const SessionBootstrap = ({ children }: { children: ReactNode }) => {
  const { session, isLoading, isConfirmedUnauthenticated } = useSession()
  const { user, setAuth, clearAuth } = useAuthStore()

  useEffect(() => {
    if (isLoading) return

    if (session && !user) {
      setAuth({
        id: session.user.id,
        email: session.user.email,
        firstName: session.user.firstName,
        lastName: session.user.lastName,
        avatar: session.user.avatar,
      })
    }

    // Confirmed 401 only, not any failed fetch — /auth/me shares authRateLimiter
    // with login/refresh-token, so a 429 must not read as "logged out."
    if (isConfirmedUnauthenticated && user) {
      clearAuth()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, session, isConfirmedUnauthenticated])

  return <>{children}</>
}

export default SessionBootstrap
