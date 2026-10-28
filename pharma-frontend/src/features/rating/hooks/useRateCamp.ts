import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ratingService } from '@/features/rating/rating.service'
import type { CreateRatingPayload, UpdateRatingPayload } from '@/types/rating.types'
import { toast } from '@/components/ui/sonner'
import { getApiErrorMessage } from '@/utils/apiError'

/** Create (first time) or update (editing a prior rating) — both invalidate the ratings cache. */
export const useRateCamp = () => {
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['ratings'] })

  const createMutation = useMutation({
    mutationFn: (payload: CreateRatingPayload) => ratingService.createRating(payload),
    onSuccess: () => {
      invalidate()
      toast.success('Rating submitted')
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Could not submit rating — try again.')),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateRatingPayload }) =>
      ratingService.updateRating(id, payload),
    onSuccess: () => {
      invalidate()
      toast.success('Rating updated')
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Could not update rating — try again.')),
  })

  return {
    rateCamp: (payload: CreateRatingPayload) => createMutation.mutateAsync(payload),
    updateRating: (id: string, payload: UpdateRatingPayload) => updateMutation.mutateAsync({ id, payload }),
    isSubmitting: createMutation.isPending,
    isUpdating: updateMutation.isPending,
  }
}
