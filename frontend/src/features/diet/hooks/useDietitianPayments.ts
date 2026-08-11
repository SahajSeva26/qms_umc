import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { addDietPayment, getPayments } from '@/features/diet/services/dietitianPayment.service'
import { dietKeys } from './dietQueryKeys'

// Payout ledger. Replaces DietitianPaymentPage's
// `useEffect(() => { getPayments().then(setPayments) }, [refreshTick])`
// plus its manual `refetch()` bump.
export const useDietPayments = () => {
  return useQuery({
    queryKey: dietKeys.payments(),
    queryFn: getPayments,
  })
}

/**
 * diet-payment:manage — record ONE payout against a dietitian's camps.
 *
 * AUTHORIZATION BOUNDARY for the single-payment action. The Payment screen
 * already hides the affordance behind useDietPermissions().canManagePayments;
 * this mutationFn is where the matching server-side check will be mirrored so
 * the rule is not enforced only by a hidden button. The capability is declared
 * as DIET_PERMISSIONS.PAYMENT_MANAGE and stays unwired until the backend
 * defines it — see useDietPermissions.ts.
 *
 * WHY THE BULK PATHS STAY ON THE SERVICE: the page's CSV-import and
 * reconciliation flows loop addDietPayment() per row and invalidate ONCE at
 * the end. Routing them through this hook would fire one invalidation — and
 * one refetch of the whole ledger — per imported row. They are a single
 * operator action over many rows, so the bulk loop keeps its single write
 * boundary at the page. When the API lands they become one batch endpoint.
 *
 * INVALIDATION: a payout changes the ledger query and, through it, the paying
 * dietitian's profile bundle (payment ledger + rollup + per-camp PAID status).
 * Nothing else derives from the payments store, so the roster, invites and
 * candidate queries are deliberately left alone.
 */
export const useAddDietPayment = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: Parameters<typeof addDietPayment>[0]) => addDietPayment(payload),
    onSuccess: (_data, payload) => {
      queryClient.invalidateQueries({ queryKey: dietKeys.payments() })
      queryClient.invalidateQueries({ queryKey: dietKeys.profileFor(payload.dietitianId) })
    },
  })
}
