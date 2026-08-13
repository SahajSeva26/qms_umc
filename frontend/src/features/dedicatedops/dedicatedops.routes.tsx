import type { RouteObject } from 'react-router-dom'
import { lazyRoute } from '@/lib/router/lazyRoute'

export const DEDICATEDOPS_ROUTES = {
  DEDICATEDOPS: '/fo/dedicated',
}

// KNOWN GAP, BLOCKED ON BACKEND — this route is NOT permission-guarded.
//
// The app's real RBAC guard already exists and is used elsewhere (see
// features/projects/projects.routes.tsx for the established pattern):
//
//   lazy: lazyRoute(() => import('./pages/DedicatedOpsPage'), [...])
//
// It is not applied here because the backend's permission registry
// (backend/src/shared/env/permissions.ts) has no `dedicated-ops:*` codes yet
// — there is no module for this feature in backend/src/modules/. Wrapping
// this route with an invented code, or with none at all (`anyOf={[]}`),
// would not add security: hasAnyPermission([]) evaluates false for anyone
// without `system:manage`, so it would silently lock every current user out
// of a feature that works today. Guessing a plausible-looking code would be
// worse — it would look guarded while enforcing nothing, since
// usePermission() only ever holds codes the server actually issued.
//
// The `rolesAllowed` gate on this route's nav entry (navConfig.ts) is the
// legacy flat-role system, not this. It is UI-hiding, not authorization, and
// per root CLAUDE.md §5a is intentionally left as-is on existing screens
// until the whole app migrates off role-based nav.
//
// TO CLOSE THIS GAP: once dedicated-ops permission codes exist server-side
// (module + AuthorizeMiddleware guards on the future API), pass them as
// lazyRoute's second argument exactly like projects.routes.tsx does. Until
// then, this is enforced nowhere but the backend endpoints themselves once
// they exist — frontend RBAC is UI/access control, not security.
export const dedicatedOpsRoutes: RouteObject[] = [
  { path: DEDICATEDOPS_ROUTES.DEDICATEDOPS, lazy: lazyRoute(() => import('./pages/DedicatedOpsPage')) },
]
