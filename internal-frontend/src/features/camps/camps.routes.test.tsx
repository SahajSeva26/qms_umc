import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { useSession } from '@/hooks/useSession'
import { campsRoutes, CAMPS_ROUTES } from './camps.routes'

vi.mock('@/hooks/useSession')

function mockSessionPermissions(permissions: string[]) {
  vi.mocked(useSession).mockReturnValue({
    isLoading: false, isFetching: false, isSettled: true, isError: false, error: null,
    isConfirmedUnauthenticated: false,
    session: {
      user: { id: 'u-1', email: 'a@example.com', firstName: 'a', lastName: 'b' },
      role: { id: 'role-1', code: 'role-code', name: 'Role' },
      roleType: { id: 'rt-1', code: 'rt-code', name: 'RoleType' },
      tenant: { id: 't-1', code: 'tenant-1', name: 'Tenant', type: 'customer' },
      permissions,
    },
    permissions,
    hasPermission: (code: string) => permissions.includes(code),
    hasAnyPermission: (codes: string[]) => codes.some((c) => permissions.includes(c)),
    hasAllPermissions: (codes: string[]) => codes.every((c) => permissions.includes(c)),
    refetchSession: vi.fn(),
  } as unknown as ReturnType<typeof useSession>)
}

// Exercises the real `lazy()` loader each route is registered with — the exact function react-router
// calls — rather than re-deriving its permission array, so this can't silently drift from
// camps.routes.tsx. lazyRoute's fail-open pre-check short-circuits to a Component that renders
// <Navigate to="/unauthorized" /> when the session lacks every listed permission; mounting a real
// /unauthorized route alongside it (same shape as app/router.tsx) makes that redirect observable.
// The permission pre-check (hasAnyPermissionHint) reads the real queryClient cache independently of
// the useSession mock above, so it's left at its default "fail open" (no cached session) — the thing
// under test is RequirePermission's own, authoritative check, reached only once the pre-check passes.
// Mounted at the route's own real path (not a generic "/mounted") so a route that reads/uses its
// own URL params (e.g. the detail route's :id-driven redirect) behaves as it would in the app,
// rather than silently no-op'ing on an undefined param and only "passing" because nothing rendered.
async function resolveAndRender(routePath: string, mountAt: string) {
  const route = campsRoutes.find((r) => r.path === routePath)
  if (!route?.lazy) throw new Error(`No lazy route registered for ${routePath}`)
  // Every route here is registered via lazyRoute(), which always assigns `lazy` as a plain async
  // function — react-router's wider LazyRouteFunction | LazyRouteObject union doesn't reflect that.
  const lazyFn = route.lazy as () => Promise<{ Component?: React.ComponentType }>
  const { Component } = await lazyFn()
  if (!Component) throw new Error(`Route loader for ${routePath} returned no Component`)
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[mountAt]}>
        <Routes>
          <Route path={routePath} element={<Component />} />
          <Route path="/unauthorized" element={<div>unauthorized-marker</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('camps.routes.tsx — GET /camps and GET /camps/:id both accept camp:book (pharma field-force read access)', () => {
  it('a camp:book-only session reaches the camps list route (not redirected to /unauthorized)', async () => {
    mockSessionPermissions(['camp:book'])
    await resolveAndRender(CAMPS_ROUTES.CAMPS, '/camps')
    expect(screen.queryByText('unauthorized-marker')).not.toBeInTheDocument()
  })

  it('a camp:book-only session reaches the camp detail route (not redirected to /unauthorized)', async () => {
    mockSessionPermissions(['camp:book'])
    await resolveAndRender(CAMPS_ROUTES.CAMP_DETAIL, '/camps/camp-1')
    expect(screen.queryByText('unauthorized-marker')).not.toBeInTheDocument()
  })

  it('a session with no relevant permission IS redirected to /unauthorized for the camps list route', async () => {
    mockSessionPermissions(['unrelated:code'])
    await resolveAndRender(CAMPS_ROUTES.CAMPS, '/camps')
    expect(await screen.findByText('unauthorized-marker')).toBeInTheDocument()
  })

  it('a session with no relevant permission IS redirected to /unauthorized for the camp detail route', async () => {
    mockSessionPermissions(['unrelated:code'])
    await resolveAndRender(CAMPS_ROUTES.CAMP_DETAIL, '/camps/camp-1')
    expect(await screen.findByText('unauthorized-marker')).toBeInTheDocument()
  })
})
