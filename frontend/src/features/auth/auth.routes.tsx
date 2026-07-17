import type { RouteObject } from 'react-router-dom'
import LoginPage from './pages/LoginPage'

export const AUTH_ROUTES = {
  ROOT: '/auth',
  LOGIN: '/auth/login',
}

export const authRoutes: RouteObject[] = [
  {
    path: AUTH_ROUTES.LOGIN,
    element: <LoginPage />,
  },
]
