import type { ComponentType } from 'react'
import { Navigate } from 'react-router-dom'
import RequirePermission from '@/components/layouts/RequirePermission'
import { hasAnyPermissionHint } from '@/lib/auth/lazyPermissionHint'

type ImportPage = () => Promise<{ default: ComponentType }>

// Skips the chunk import() when the fail-open permission pre-check knows RequirePermission
// would redirect anyway; RequirePermission itself still always renders when `anyOf` is passed.
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
