import { describe, it, expect } from 'vitest'
import appRouter from './router'

// Flattens the real appRouter's route tree (not a synthetic test-only router — router.test.tsx's
// own harness intentionally rebuilds a minimal router for a different purpose, chunk-loading
// fallback behavior, and would not have caught the regression this file exists to prevent) into a
// flat list of registered path strings, so a missing/duplicated path is a simple, direct assertion
// rather than something only discoverable by actually navigating a rendered browser router.
function collectPaths(routes: typeof appRouter.routes): string[] {
  return routes.flatMap((route) => {
    const own = route.path ? [route.path] : []
    return route.children ? [...own, ...collectPaths(route.children)] : own
  })
}

describe('appRouter — /pharma is registered as a real route, not just the index (\'/\')', () => {
  // Production serves this build under the public '/pharma/*' prefix (one shared origin,
  // path-routed by the deployment proxy — see md-files/FRONTEND_SPLIT_ARCHITECTURE.md §5a); a
  // direct visit to that deployed root is a real, expected entry point, not just the bare dev-
  // server root ('/', localhost:5174/). Before this fix, only the index route ('/') resolved
  // PharmaIndexRedirect — a direct hit on '/pharma' fell through to the catch-all '*' and rendered
  // NotFoundPage instead of resolving the session's own portal.
  it('registers /pharma as its own route (not only the bare index route)', () => {
    const paths = collectPaths(appRouter.routes)
    expect(paths).toContain('/pharma')
  })

  it('still registers the bare index route ("/") for local dev, where no proxy sits in front', () => {
    // The index route itself has no `path` property (React Router's `index: true` convention) —
    // confirmed by its PRESENCE as a route object rather than its path string.
    const hasIndexRoute = appRouter.routes.some((route) =>
      route.children?.some((child) => child.children?.some((grandchild) => grandchild.index === true)),
    )
    expect(hasIndexRoute).toBe(true)
  })

  it('registers every known pharma portal path, so a direct deep link to any of them is reachable', () => {
    const paths = collectPaths(appRouter.routes)
    expect(paths).toEqual(
      expect.arrayContaining(['/pharma', '/pharma/mr', '/pharma/ho', '/pharma/rsm', '/pharma/asm', '/pharma/camps/:id']),
    )
  })
})
