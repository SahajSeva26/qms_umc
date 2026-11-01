import { isAdminLike, isPaymentAdminLike } from '@/features/diet/services/dietScope.service'

// The Diet feature's authorization seam.
//
// WHY A HOOK AND NOT A SERVICE: today these answers come from the logged-in
// user's role name, which is a pure function. Tomorrow they come from
// `usePermission()` — a hook. Shaping the seam as a hook now means the swap is
// a change to the three function bodies below and nothing else; components
// already consume it in the form the permission-based version needs.
//
// WHY THE CODES ARE NOT WIRED YET: the backend defines no diet permissions.
// Verified against backend/src/shared/env/permissions.ts — the registry has
// camp/doctor/tenant/appointment/contact/division/geo-profile/system/user/
// role/role-type/permission-group and nothing for diet or dietitians.
// Introducing `hasPermission('dietitian:manage')` now would silently deny
// every user, because `usePermission()` returns only codes the server issued.
// So the capability NAMES are declared here in the app's real convention
// (`resource:action`, colon — see doctor:manage / camp:manage), and the
// current role-based implementation is preserved exactly.
//
// TO ENABLE RBAC: add the codes below to the backend permissions registry,
// then replace each body with the commented-out `hasPermission(...)` line.
//
// This is UX protection only. Hiding a button is not security — the backend
// must enforce the same rules through AuthorizeMiddleware.
//
// WHERE THE CHECK GOES (settled): the mutation hook's `mutationFn`, not the
// component and not the service.
//   - Not the component: a screen can render the same action from several
//     places, and hiding an affordance is not a check.
//   - Not the service: services are also called synchronously for pure reads
//     and derivations, and they have no access to React context — which is
//     where the user's permissions live.
//   - The mutationFn is the single choke point per user action, it already
//     maps 1:1 onto a future endpoint, and it is a hook body, so it can call
//     usePermission() once the backend issues diet codes.
// Hiding/disabling the UI stays as well — the two are complementary, not
// alternatives.
//
// Every UI-triggered Diet write now goes through such a hook (roster,
// equipment, rates/assignment, invites, payments, reopen decisions), and an
// eslint `no-restricted-imports` rule in eslint.config.js stops a component
// re-importing those write functions from a service to get around it. The one
// documented exception — the payment page's bulk CSV loops — disables that
// rule inline with its reason.

/** Capability codes this feature will request once the backend defines them. */
export const DIET_PERMISSIONS = {
  /** Full diet-operations management: assign, invite, rates, camp actions. */
  MANAGE: 'diet:manage',
  /** Dietitian master: enrol, edit profile, bank details, equipment. */
  DIETITIAN_MANAGE: 'dietitian:manage',
  /** Payment ledger: record payouts, reconcile finance imports. */
  PAYMENT_MANAGE: 'diet-payment:manage',
} as const

export interface DietPermissions {
  /** Diet Coordinator Workspace: sees every coordinator's camps, not just their own. */
  canManageDiet: boolean
  /** Dietitian Payment: record payouts and run finance reconciliation. */
  canManagePayments: boolean
}

/**
 * @param role the logged-in user's role id (`user.role`)
 */
export const useDietPermissions = (role: string): DietPermissions => {
  // const { hasPermission } = usePermission()
  // return {
  //   canManageDiet: hasPermission(DIET_PERMISSIONS.MANAGE),
  //   canManagePayments: hasPermission(DIET_PERMISSIONS.PAYMENT_MANAGE),
  // }

  // Current, behaviour-preserving implementation. The two role lists stay
  // deliberately different — the Coordinator Workspace includes om_screening
  // and the Payment screen includes accounts; that asymmetry is real product
  // behaviour, not an oversight (see dietScope.service.ts).
  return {
    canManageDiet: isAdminLike(role),
    canManagePayments: isPaymentAdminLike(role),
  }
}
