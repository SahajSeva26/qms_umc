import { useMutation } from '@tanstack/react-query'
import { useAuthStore } from '@/features/auth/store'
import { authService } from '@/features/auth/auth.service'
import { useSession } from '@/hooks/useSession'
import type { LoginPayload } from '@/types/auth.types'

export const useLogin = () => {
  const { setAuth } = useAuthStore()
  const { refetchSession } = useSession()

  return useMutation({
    mutationFn: (payload: LoginPayload) => authService.login(payload),
    onSuccess: (data) => {
      if (data?.data) {
        setAuth({ ...data.data })
      }
      // Invalidate the cached session (useSession/usePermission/useActiveRole)
      // so the new user's real permissions load immediately instead of
      // waiting out the query's 5-minute staleTime or a manual refresh.
      refetchSession()
    },
  })
}
