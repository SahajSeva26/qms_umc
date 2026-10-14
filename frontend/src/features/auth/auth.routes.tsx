import type { RouteObject } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import AuthContinuePage from './pages/AuthContinuePage'

export const AUTH_ROUTES = {
  ROOT: '/auth',
  LOGIN: '/auth/login',
  // Post-login landing resolver — see AuthContinuePage for why this exists instead of a hard-coded destination.
  CONTINUE: '/auth/continue',
}

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
