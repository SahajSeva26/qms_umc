import type { RouteObject } from 'react-router-dom'
import { lazyRoute } from '@/lib/router/lazyRoute'
import * as FieldWorkspacePaths from './fieldWorkspace.paths'

export const FIELD_WORKSPACE_ROUTES = FieldWorkspacePaths.FIELD_WORKSPACE_ROUTES

// No permission uniquely identifies "field-officer" (camp:search is also held by
// managers/coordinators) — FieldWorkspacePage itself gates on session.roleType.code,
// same pattern as FieldOfficersPage's tenant-type gate.
export const fieldWorkspaceRoutes: RouteObject[] = [
  { path: FIELD_WORKSPACE_ROUTES.MY_WORKSPACE, lazy: lazyRoute(() => import('./pages/FieldWorkspacePage')) },
]
