import type { RouteObject } from 'react-router-dom'
import RequirePermission from '@/components/layouts/RequirePermission'
import ProjectsPage from './pages/ProjectsPage'
import ProjectGanttPage from './pages/ProjectGanttPage'

export const PROJECTS_ROUTES = {
  PROJECTS:       '/projects',
  PROJECTS_GANTT: '/projects/gantt',
}

// Matches project.routes.ts's real READ_GUARD exactly: project:search OR
// project:manage OR tenant:manage. Found 2026-08-04: neither this route nor
// the sidebar nav item had any guard at all — a Sales Head account (no
// project:* permission per defaultRoleTypes.ts) could see and click into
// "Project Management" from the nav and land on a real 403 "Failed to load
// projects" screen, since the backend itself does correctly enforce this gate.
const PROJECTS_VIEW_PERMISSIONS = ['project:search', 'project:manage', 'tenant:manage']

export const projectsRoutes: RouteObject[] = [
  {
    path: PROJECTS_ROUTES.PROJECTS,
    element: (
      <RequirePermission anyOf={PROJECTS_VIEW_PERMISSIONS}>
        <ProjectsPage />
      </RequirePermission>
    ),
  },
  {
    path: PROJECTS_ROUTES.PROJECTS_GANTT,
    element: (
      <RequirePermission anyOf={PROJECTS_VIEW_PERMISSIONS}>
        <ProjectGanttPage />
      </RequirePermission>
    ),
  },
]
