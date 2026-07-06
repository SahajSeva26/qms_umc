import { useMutation } from '@tanstack/react-query'
import { useAuthStore } from '@/features/auth/store'
import { authService } from '@/features/auth/auth.service'
import type { LoginPayload } from '@/types/auth.types'

export const useLogin = () => {
  const { setAuth } = useAuthStore()

  return useMutation({
    mutationFn: (payload: LoginPayload) => authService.login(payload),
    onSuccess: (data) => {
      if (data?.data?.data) {
        setAuth(data.data.data, '')
      }
    },
  })
}
