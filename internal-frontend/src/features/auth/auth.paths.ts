// Dependency-free route-path constants — safe for any module (including the shared nav registry)
// to import without pulling in pages/components/the route-object tree. See auth.routes.tsx.
export const AUTH_ROUTES = {
  ROOT: '/auth',
  LOGIN: '/auth/login',
  // Post-login landing resolver — see AuthContinuePage for why this exists instead of a hard-coded destination.
  CONTINUE: '/auth/continue',
}
