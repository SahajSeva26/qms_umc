import {
  CAMP_VIEW_PERMISSIONS,
  CAMP_WRITE_PERMISSIONS,
  CAMP_DETAIL_PERMISSIONS,
  CAMP_EDIT_PERMISSIONS,
  CAMP_SCREENING_PERMISSIONS,
} from '@/lib/access/campAccess'
import type { VisibleNavSession } from '@/lib/navigation/visibleNav'

// Feature-owned route-policy matchers for returnTo validation (see returnTo.ts). The generic
// nav-registry check (isInternalPathReachable in returnTo.ts) only covers an EXACT top-level nav
// item path — real deep links are almost always nested/parameterized under that item (a camp
// drawer's ?camp=<id>, an edit page, a detail page), each gated by its OWN permission set distinct
// from the parent nav item's. Each entry here is a feature's own route family: a `test` that
// recognizes the path shape, paired with the SAME permission list that feature's own route module
// (e.g. camps.routes.tsx) actually enforces for that path — kept in one shared, business-
// independent location (like campAccess.ts) so this file doesn't need to import a whole route
// module (pulling in every lazy page's module graph) just to validate a string.
//
// A path matching no family here simply isn't treated as a legitimate returnTo target — falls
// back to the role's normal landing page, the safe default. This is UX routing protection only;
// the backend route/permission guard remains the real authorization boundary regardless.
interface RouteFamily {
  test: (path: string) => boolean
  permissions: string[]
}

// All four imported directly from campAccess.ts — the single source camps.routes.tsx's real
// route guards also import from, so this can't drift from the actual permission contract.

const ROUTE_FAMILIES: RouteFamily[] = [
  // The camp drawer, opened via a search param on the base list route — e.g. '/camps?camp=cmp-1'.
  // Same permission as the bare '/camps' list itself (CAMP_VIEW_PERMISSIONS, already covered by
  // the exact-match nav-registry check) — this entry exists only to admit the '?camp=' variant,
  // which the exact-match check rejects outright (it's a different string from '/camps').
  {
    test: (path) => {
      const [pathname, search] = path.split('?')
      return pathname === '/camps' && !!search && new URLSearchParams(search).has('camp')
    },
    permissions: CAMP_VIEW_PERMISSIONS,
  },
  { test: (path) => path === '/camps/new', permissions: CAMP_WRITE_PERMISSIONS },
  // '/camps/:id' itself is a redirect page (CampDetailRedirectPage, back to '/camps?camp=:id') —
  // not excluded here: a returnTo landing on it still 200s and redirects correctly client-side,
  // so admitting it is harmless, but the '?camp=' form above is the one real bookmarkable shape.
  { test: (path) => /^\/camps\/[^/?#]+$/.test(path), permissions: CAMP_DETAIL_PERMISSIONS },
  { test: (path) => /^\/camps\/[^/?#]+\/edit$/.test(path), permissions: CAMP_EDIT_PERMISSIONS },
  { test: (path) => /^\/camps\/[^/?#]+\/screening$/.test(path), permissions: CAMP_SCREENING_PERMISSIONS },
]

/** Whether `candidatePath` matches a known feature-owned route family AND this session holds that
 * family's required permission, OR holds system:manage (the backend's universal bypass-all —
 * mirrors isRealSystemManage in visibleNav.ts, the same bypass the exact-match nav-item check
 * in returnTo.ts already gets via isNavItemVisible) — independent of whether it's also a
 * top-level nav item. */
export function matchesInternalRouteFamily(session: VisibleNavSession, candidatePath: string): boolean {
  const family = ROUTE_FAMILIES.find((f) => f.test(candidatePath))
  if (!family) return false
  return session.permissions.includes('system:manage') || family.permissions.some((code) => session.permissions.includes(code))
}
