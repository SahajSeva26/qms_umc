import type { ComponentType } from 'react'
import { Navigate } from 'react-router-dom'
import RequirePermission from '@/components/layouts/RequirePermission'
import { hasAnyPermissionHint } from '@/lib/auth/lazyPermissionHint'

type ImportPage = () => Promise<{ default: ComponentType }>

// Shared factory for a React Router v7 route `lazy` loader, used by every
// feature's [feature].routes.tsx. Encodes the one pattern repeated across
// every gated route in the app — <RequirePermission anyOf={...}><Page/></>
// — but defers the page's own import() until the route actually matches,
// and skips the import entirely when the fail-open permission pre-check
// already knows RequirePermission would redirect anyway. Pulled into one
// function (rather than inlined per route) so this exact behavior can't
// drift or be typo'd across 18+ feature route files as more are added.
//
// RequirePermission itself is ALWAYS still rendered, completely unmodified,
// whenever `anyOf` is passed — this only ever adds a cheaper "don't bother
// fetching the chunk" fast path in front of it; it never replaces, weakens,
// or bypasses it. Pass no `anyOf` for routes that have no frontend guard
// today (matches existing routes exactly — this never adds a permission
// check that wasn't already there).
export function lazyRoute(importPage: ImportPage, anyOf?: string[]) {
  return async () => {
    if (anyOf && !hasAnyPermissionHint(anyOf)) {
      return { Component: () => <Navigate to="/unauthorized" replace /> }
    }
    const { default: Page } = await importPage()
    if (!anyOf) return { Component: Page }
    return {
      Component: () => (
        <RequirePermission anyOf={anyOf}>
          <Page />
        </RequirePermission>
      ),
    }
  }
}
