import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  requestBcaScale, verifyBcaScale, logStockMovement,
} from '@/features/diet/services/dietitianEquipment.service'
import { dietKeys } from './dietQueryKeys'

// BCA scale & stock-movement writes.
//
// AUTHORIZATION BOUNDARY. These three were the last UI-triggered Diet writes
// still called straight from a component (BcaEquipmentCard, BcaVerifyDialog,
// LogStockMovementDialog), which meant they had no single place to put a
// permission check and no place to own their own cache invalidation — they
// relied on the profile page passing an `onChanged` callback that blanket-
// invalidated the entire `['diet']` subtree. Each mutationFn below is now the
// one choke point for its action, exactly as useDietitianRoster's are.
//
// Each maps 1:1 onto a future endpoint (POST /dietitians/:id/bca/request,
// /bca/verify, /stock-movements), so the RBAC check and the api.* call land in
// the same place. The capability these will request is
// DIET_PERMISSIONS.DIETITIAN_MANAGE ('dietitian:manage' — equipment is part of
// the dietitian master); it is NOT wired here because the backend defines no
// diet permissions yet, and gating on a code the server never issues would
// deny every user. See useDietPermissions.ts for that reasoning in full.
//
// INVALIDATION: all three write one dietitian's equipment record, which is
// read by exactly one query — that dietitian's profile bundle. Nothing else
// (roster, payments, invites, camps) derives from the equipment store, so the
// invalidation is scoped to `profileFor(id)` rather than the whole subtree.
// The pickers read equipment through a synchronous per-render index, not a
// query, so they are unaffected.

/** Shared invalidation for every equipment write. */
function useInvalidateDietitian() {
  const queryClient = useQueryClient()
  return (dietitianId: string) =>
    queryClient.invalidateQueries({ queryKey: dietKeys.profileFor(dietitianId) })
}

/** dietitian:manage — ask logistics to allocate a BCA scale. */
export const useRequestBcaScale = () => {
  const invalidate = useInvalidateDietitian()
  return useMutation({
    mutationFn: ({ dietitianId, by }: { dietitianId: string; by: string }) =>
      requestBcaScale(dietitianId, by),
    onSuccess: (_data, { dietitianId }) => invalidate(dietitianId),
  })
}

/** dietitian:manage — mark a received scale verified (owned + verified). */
export const useVerifyBcaScale = () => {
  const invalidate = useInvalidateDietitian()
  return useMutation({
    mutationFn: ({ dietitianId, videoUrl, by }: { dietitianId: string; videoUrl?: string; by: string }) =>
      verifyBcaScale(dietitianId, { videoUrl }, by),
    onSuccess: (_data, { dietitianId }) => invalidate(dietitianId),
  })
}

/** dietitian:manage — append a stock-movement log entry. */
export const useLogStockMovement = () => {
  const invalidate = useInvalidateDietitian()
  return useMutation({
    mutationFn: ({ dietitianId, action, fromLocation, toLocation, by }: {
      dietitianId: string; action: string; fromLocation?: string; toLocation?: string; by: string
    }) => logStockMovement(dietitianId, { action, fromLocation, toLocation }, by),
    onSuccess: (_data, { dietitianId }) => invalidate(dietitianId),
  })
}
