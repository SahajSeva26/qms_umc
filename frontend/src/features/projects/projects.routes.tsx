import type { RouteObject } from 'react-router-dom'
import ProjectsPage from './pages/ProjectsPage'

export const projectsRoutes: RouteObject[] = [
  { path: '/projects', element: <ProjectsPage /> },
]
