import type { RouteObject } from 'react-router-dom'
import { lazyRoute } from '@/lib/router/lazyRoute'
import { PROJECTS_VIEW_PERMISSIONS } from '@/lib/access/projectAccess'
import * as ProjectsPaths from './projects.paths'

// A direct `export const` (not a bare re-export specifier) — see camps.routes.tsx for why.
export const PROJECTS_ROUTES = ProjectsPaths.PROJECTS_ROUTES

// The real permission list is defined in lib/access/projectAccess.ts (shared,
// dependency-free) so other features (e.g. notifications' entity resolver)
// can check project reachability without importing this route module.
// Found 2026-08-04: neither this route nor the sidebar nav item had any
// guard at all — a Sales Head account (no project:* permission per
// defaultRoleTypes.ts) could see and click into "Project Management" from
// the nav and land on a real 403 "Failed to load projects" screen, since the
// backend itself does correctly enforce this gate.
export const projectsRoutes: RouteObject[] = [
  {
    path: PROJECTS_ROUTES.PROJECTS,
    lazy: lazyRoute(() => import('./pages/ProjectsPage'), PROJECTS_VIEW_PERMISSIONS),
  },
  {
    path: PROJECTS_ROUTES.PROJECTS_GANTT,
    lazy: lazyRoute(() => import('./pages/ProjectGanttPage'), PROJECTS_VIEW_PERMISSIONS),
  },
]
