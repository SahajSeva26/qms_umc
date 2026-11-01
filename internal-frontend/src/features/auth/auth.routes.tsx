import type { RouteObject } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import AuthContinuePage from './pages/AuthContinuePage'
import * as AuthPaths from './auth.paths'

// A direct `export const` (not a bare re-export specifier) — see camps.routes.tsx for why.
export const AUTH_ROUTES = AuthPaths.AUTH_ROUTES

export const authRoutes: RouteObject[] = [
  {
    path: AUTH_ROUTES.LOGIN,
    element: <LoginPage />,
  },
  {
    // No AppLayout chrome — this page only ever renders a brief loading/error state before redirecting.
    path: AUTH_ROUTES.CONTINUE,
    element: <AuthContinuePage />,
  },
]
