import type { AxiosInstance } from 'axios'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createRating, updateRating } from '../rating.service'
import type { CreateRatingPayload, UpdateRatingPayload } from '../rating.types'

export interface UseRateCampDeps {
  api: AxiosInstance
  /** Each app's own toast function (both currently re-export the same `sonner` toast via
   * @qms/ui's Toaster, so this is typically just `import { toast } from '@qms/ui'`). */
  toast: { success: (msg: string) => void; error: (msg: string) => void }
  /** Each app's own axios-error-to-message extractor — the two apps' ApiError body shapes differ
   * slightly, so this stays an injected dependency rather than a shared implementation. */
  getErrorMessage: (err: unknown, fallback: string) => string
}

/** The MR's "rate this camp's worker" action — one create (first time) or update (editing their
 * own prior rating) mutation, both invalidating the same ['ratings', ...] cache. */
export function useRateCamp({ api, toast, getErrorMessage }: UseRateCampDeps) {
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['ratings'] })

  const createMutation = useMutation({
    mutationFn: (payload: CreateRatingPayload) => createRating(api, payload),
    onSuccess: () => {
      invalidate()
      toast.success('Rating submitted')
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Could not submit rating — try again.')),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateRatingPayload }) => updateRating(api, id, payload),
    onSuccess: () => {
      invalidate()
      toast.success('Rating updated')
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Could not update rating — try again.')),
  })

  return {
    rateCamp: (payload: CreateRatingPayload) => createMutation.mutateAsync(payload),
    updateRating: (id: string, payload: UpdateRatingPayload) => updateMutation.mutateAsync({ id, payload }),
    isSubmitting: createMutation.isPending,
    isUpdating: updateMutation.isPending,
  }
}
