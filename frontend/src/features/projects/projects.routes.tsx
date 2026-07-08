import type { RouteObject } from 'react-router-dom'
import ProjectsPage from './pages/ProjectsPage'

export const PROJECTS_ROUTES = {
  PROJECTS:       '/projects',
  PROJECTS_GANTT: '/projects/gantt',
}

export const projectsRoutes: RouteObject[] = [
  { path: PROJECTS_ROUTES.PROJECTS,       element: <ProjectsPage /> },
  { path: PROJECTS_ROUTES.PROJECTS_GANTT, element: <ProjectsPage /> },
]
