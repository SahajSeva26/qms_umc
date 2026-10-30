import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Camp } from '@/types/camp.types'
import { assignDietitianByCoordPatch } from '@/features/diet/services/dietCampWorkflow.service'
import { recordDietitianRates } from '@/features/diet/services/dietitianRates.service'
import { useCampsData } from '@/hooks/useCampsData'
import { dietKeys } from './dietQueryKeys'

// Assign a dietitian to a camp and record the agreed rates.
//
// WHY THIS WRAPS THE WHOLE ACTION AND NOT JUST recordDietitianRates
// Both rate sheets did the same three steps inline: build the camp patch via
// assignDietitianByCoordPatch(), persist it through the shared camps hook,
// then append the rate-history entry. That is ONE user action ("assign &
// record rates") spread across two writes and duplicated in two components.
//
// Wrapping only recordDietitianRates would have left the camp write — the part
// that actually assigns the dietitian — outside the boundary, so a component
// could still assign someone by calling patchCamp directly and simply skip the
// audit trail. Making the pair atomic from the caller's point of view is what
// closes that gap, and it collapses the duplicated orchestration into one
// place. This mirrors useDietCamps' own mutations, which already compose
// useCampsData's patchCamp with a Diet-owned patch builder.
//
// AUTHORIZATION BOUNDARY: this mutationFn is the single choke point. The
// capability it will request is DIET_PERMISSIONS.MANAGE ('diet:manage' —
// assignment and rates are diet operations, not dietitian-master edits). It is
// NOT wired yet: the backend defines no diet permission codes, so gating on
// one would deny every user. See useDietPermissions.ts.
//
// API MIGRATION: maps onto a single future POST /camps/:id/dietitian-assignment
// carrying both the assignment and the rates — which is the shape the server
// wants anyway, since the two writes must not diverge.
//
// BUSINESS RULE PRESERVED: assignDietitianByCoordPatch() returns null when the
// dietitian has not cleared OM·Diet approval. That stays the authoritative
// gate; it is surfaced here as a rejection so the mutation cannot silently
// half-complete.

export const DIETITIAN_NOT_APPROVED = 'Dietitian pending OM·Diet approval — cannot assign'

export interface AssignDietitianRates {
  remuneration: number
  ta: number
  printing: number
  targetCost: number
  reason: string
}

export interface AssignDietitianVars {
  camp: Camp
  dietitianId: string
  /** Display name of the acting user — written into the proposal + rate entry. */
  by: string
  rates: AssignDietitianRates
}

/** diet:manage — assign a dietitian to a camp and append the rate-history entry. */
export const useAssignDietitianWithRates = () => {
  const queryClient = useQueryClient()
  const { patchCamp } = useCampsData()

  return useMutation({
    mutationFn: async ({ camp, dietitianId, by, rates }: AssignDietitianVars) => {
      const patch = assignDietitianByCoordPatch(camp, dietitianId, by, rates)
      if (!patch) throw new Error(DIETITIAN_NOT_APPROVED)
      await patchCamp(camp.id, patch)
      return recordDietitianRates(dietitianId, { ...rates, campId: camp.id, setBy: by })
    },
    // patchCamp already invalidates ['camps'], which is what the camp lists,
    // the payment rollup and the picker index all recompute from. The only
    // additional cache entry the rate-history write touches is this
    // dietitian's profile bundle (its rate-trend section), so that is the only
    // extra invalidation — not the whole ['diet'] subtree.
    onSuccess: (_data, { dietitianId }) => {
      queryClient.invalidateQueries({ queryKey: dietKeys.profileFor(dietitianId) })
    },
  })
}
