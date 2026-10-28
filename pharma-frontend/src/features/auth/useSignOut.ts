import { useMutation } from '@tanstack/react-query'
import { authService } from '@/features/auth/auth.service'
import ENV from '@/config/env'

// Pharma-frontend has no in-app login route or local auth store to clear (the
// shared login lives at the internal app's origin — see AppLayout.tsx), so a
// successful sign-out is a cross-origin hard redirect, not a client-side
// navigate. Crucially, that redirect must wait for /auth/logout to actually
// resolve: the backend only clears the access/refresh cookies and invalidates
// the server-side refresh token AFTER its own logout call completes, so
// redirecting immediately risks cancelling the in-flight request and leaving
// a still-valid session behind. useMutation (not local useState) gives this
// the project's standard server-state/mutation-lifecycle handling.
export const useSignOut = () => {
  const mutation = useMutation({
    mutationFn: () => authService.logout(),
    onSuccess: () => {
      window.location.href = `${ENV.Hosts.InternalOrigin}/auth/login`
    },
  })

  return {
    signOut: () => mutation.mutate(),
    isPending: mutation.isPending,
    error: mutation.isError ? 'Sign out failed. Please try again.' : null,
  }
}
