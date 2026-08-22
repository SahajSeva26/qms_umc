import { useMutation } from '@tanstack/react-query'
import { reopenRequestDecisionPatch } from '@/features/diet/services/dietCampWorkflow.service'
import { useCampsShared } from '@/features/camps/hooks/useCampsShared'

// Diet camp workflow decisions taken by a coordinator.
//
// AUTHORIZATION BOUNDARY. This was the last Diet action still assembled in a
// component: ReopenTab built the camp patch itself and pushed it through
// useCampsData's patchCamp, so approving a 24-hour reopen had no Diet-owned
// choke point — the only thing standing between any component and granting a
// reopen was that nobody had written the two lines. The mutationFn below is
// now that choke point, matching every other Diet write.
//
// The capability it will request is DIET_PERMISSIONS.MANAGE ('diet:manage' —
// reopen decisions are a coordinator operation). Not wired yet: the backend
// defines no diet permission codes. See useDietPermissions.ts. The screen's
// existing adminLike/coordId scoping of WHICH requests are visible is
// unchanged and remains a separate, complementary rule.
//
// INVALIDATION: the decision writes only the camp record. patchCamp already
// invalidates ['camps'], which is what the reopen inbox re-derives from, so
// there is deliberately no additional invalidation here — adding one would be
// a refetch with nothing to refresh.
//
// API MIGRATION: maps onto POST /camps/:id/reopen-requests/decision.

export const useDecideReopenRequest = () => {
  const { patchCamp } = useCampsShared()

  return useMutation({
    mutationFn: ({ camp, decision, by, denialReason }: {
      camp: Parameters<typeof reopenRequestDecisionPatch>[0]
      decision: 'APPROVED' | 'DENIED'
      by: string
      denialReason?: string
    }) => patchCamp(camp.id, reopenRequestDecisionPatch(camp, decision, by, denialReason)),
  })
}
