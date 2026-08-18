import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { qaFeedbackService } from '@/features/qa-feedback/qaFeedback.service'
import type { CreateQaFeedbackPayload, SearchQaFeedbackQuery, UpdateQaFeedbackPayload } from '@/types/qaFeedback.types'
import { toast } from '@/components/ui/sonner'
import { getApiErrorMessage } from '@/utils/apiError'

// Same shape as useLeads.ts — one ['qa-feedback', query] TanStack Query
// cache, mutations invalidate it so the review dashboard refetches.
const DEFAULT_LIMIT = '10'

// `fetchList` (default true) lets a caller that only wants createFeedback/
// updateFeedback (e.g. FeedbackWidget.tsx) skip the list query entirely.
export const useQaFeedback = (query: SearchQaFeedbackQuery = {}, fetchList: boolean = true) => {
  const queryClient = useQueryClient()
  const effectiveQuery: SearchQaFeedbackQuery = { limit: DEFAULT_LIMIT, ...query }

  const { data, isLoading, error } = useQuery({
    queryKey: ['qa-feedback', effectiveQuery],
    queryFn: () => qaFeedbackService.searchFeedback(effectiveQuery),
    enabled: fetchList,
  })

  const items = data?.data?.items ?? []
  const count = data?.data?.count ?? 0

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['qa-feedback'] })

  const createMutation = useMutation({
    mutationFn: (payload: CreateQaFeedbackPayload) => qaFeedbackService.createFeedback(payload),
    onSuccess: () => {
      invalidate()
      toast.success('Feedback submitted — thanks!')
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Could not submit feedback — try again.')),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateQaFeedbackPayload }) =>
      qaFeedbackService.updateFeedback(id, payload),
    onSuccess: () => {
      invalidate()
      toast.success('Updated')
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Could not update — try again.')),
  })

  return {
    items,
    count,
    isLoading,
    error,
    // mutateAsync so callers can await and only close a dialog on real success.
    createFeedback: (payload: CreateQaFeedbackPayload) => createMutation.mutateAsync(payload),
    updateFeedback: (id: string, payload: UpdateQaFeedbackPayload) => updateMutation.mutateAsync({ id, payload }),
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
  }
}
