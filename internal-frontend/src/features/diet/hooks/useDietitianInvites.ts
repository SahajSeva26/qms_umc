import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import type { InviteSummary } from '@/features/diet/dietitians.types'
import {
  fetchCampInvites, addCampInvites, recordInviteResponse, summarizeInvites,
} from '@/features/diet/services/dietitianInvite.service'
import { dietKeys } from './dietQueryKeys'

// Camp invitations. Replaces the manual `setVersion(v => v + 1)` bump both
// invite modals used to force a re-read after a write — the mutations below
// invalidate the camp's invite key instead, and every observer of that key
// updates on its own.

export const useCampInvites = (campId: string | null | undefined) => {
  return useQuery({
    queryKey: dietKeys.invites(campId ?? ''),
    queryFn: () => fetchCampInvites(campId as string),
    enabled: !!campId,
  })
}

/**
 * Invite summaries for MANY camps — the Assign tab's per-card counters.
 *
 * That tab used to call the synchronous inviteSummary() per card, which reads
 * the store but subscribes to nothing, so after sending invites the counters
 * only refreshed because the component invalidated the whole `['diet']`
 * subtree on modal close purely to force a re-render. Subscribing to the SAME
 * `dietKeys.invites(campId)` entries the invite modal already writes through
 * makes the mutations' own invalidation update these counters, and adds no
 * duplicate cache entries — the keys and queryFn are identical.
 *
 * Deliberately not memoised: summarizeInvites() is four filters over a handful
 * of invites, so rebuilding the map per render costs less than tracking it.
 */
export const useCampInviteSummaries = (campIds: string[]): Map<string, InviteSummary> => {
  const results = useQueries({
    queries: campIds.map((campId) => ({
      queryKey: dietKeys.invites(campId),
      queryFn: () => fetchCampInvites(campId),
    })),
  })

  const summaries = new Map<string, InviteSummary>()
  campIds.forEach((campId, i) => {
    summaries.set(campId, summarizeInvites(results[i]?.data ?? []))
  })
  return summaries
}

export const useAddCampInvites = (campId: string | null | undefined) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ dietitianIds, sentBy }: { dietitianIds: string[]; sentBy: string }) =>
      addCampInvites(campId as string, dietitianIds, sentBy, 'WHATSAPP'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dietKeys.invites(campId ?? '') })
    },
  })
}

export const useRecordInviteResponse = (campId: string | null | undefined) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ dietitianId, response, note }: { dietitianId: string; response: 'ACCEPTED' | 'DECLINED'; note?: string }) =>
      recordInviteResponse(campId as string, dietitianId, response, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dietKeys.invites(campId ?? '') })
    },
  })
}
