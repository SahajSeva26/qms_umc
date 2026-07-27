import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { qaFeedbackService } from '@/features/qa-feedback/qaFeedback.service'
import type { CreateQaFeedbackPayload, SearchQaFeedbackQuery, UpdateQaFeedbackPayload } from '@/types/qaFeedback.types'
import { toast } from '@/components/ui/sonner'

// Same shape as useLeads.ts — one ['qa-feedback', query] TanStack Query
// cache, mutations invalidate it so the review dashboard refetches.
const DEFAULT_LIMIT = '100'

// `fetchList` (default true) lets a caller that only wants createFeedback/
// updateFeedback skip the list query entirely. FeedbackWidget.tsx (the
// floating "To Do" button mounted globally in AppLayout.tsx, so it renders
// on EVERY authenticated page) never reads items/count/isLoading/error —
// it only submits new feedback — but calling this hook at all used to fire
// a real GET /qa-feedback?limit=100 on every single page load regardless,
// since useQuery has no built-in way to be "called but inert." Found live
// via the Network tab: a fetch with no on-screen consumer, on every page.
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
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Could not submit feedback — try again.'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateQaFeedbackPayload }) =>
      qaFeedbackService.updateFeedback(id, payload),
    onSuccess: () => {
      invalidate()
      toast.success('Updated')
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Could not update — try again.'),
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
