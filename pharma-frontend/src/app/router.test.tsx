import { describe, it, expect, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { RootLayout, RouteErrorBoundary, RouteFallback, UnauthorizedPage, NotFoundPage } from '@qms/ui'
import type { SessionResponse } from '@qms/core'
import AppLayout from '@/components/layouts/AppLayout'
import { lazyRoute } from '@/lib/router/lazyRoute'

vi.mock('@/hooks/useSession')

function sessionFixture(): SessionResponse {
  return {
    user: { id: 'u-1', email: 'a@example.com', firstName: 'a', lastName: 'b' },
    role: { id: 'role-1', code: 'pharma-mr', name: 'MR', division: 'div-1' },
    roleType: { id: 'rt-1', code: 'pharma-mr', name: 'pharma-mr' },
    tenant: { id: 't-1', code: 'tenant-1', name: 'Tenant', type: 'customer' },
    permissions: ['camp:book'],
  } as unknown as SessionResponse
}

async function mockSettledSession() {
  const { useSession } = await import('@/hooks/useSession')
  const session = sessionFixture()
  vi.mocked(useSession).mockReturnValue({
    session,
    isLoading: false,
    isFetching: false,
    isSettled: true,
    isError: false,
    error: null,
    isConfirmedUnauthenticated: false,
    permissions: session.permissions,
    hasPermission: (code: string) => session.permissions.includes(code),
    hasAnyPermission: (codes: string[]) => codes.some((c) => session.permissions.includes(c)),
    hasAllPermissions: (codes: string[]) => codes.every((c) => session.permissions.includes(c)),
    refetchSession: vi.fn(),
  } as unknown as ReturnType<typeof useSession>)
}

// A never-resolving import() pins the index route's `lazy` loader in-flight
// indefinitely, so the test can assert what's on screen *during* that gap
// without racing a real chunk load.
function pendingImport() {
  return new Promise<{ default: React.ComponentType }>(() => {})
}

function buildRouter(importPage: () => Promise<{ default: React.ComponentType }>) {
  return createMemoryRouter([
    {
      path: '/',
      element: <RootLayout />,
      errorElement: <RouteErrorBoundary />,
      HydrateFallback: RouteFallback,
      children: [
        {
          element: <AppLayout />,
          errorElement: <RouteErrorBoundary />,
          children: [
            { index: true, lazy: lazyRoute(importPage, ['camp:book']) },
            { path: '/unauthorized', element: <UnauthorizedPage homePath="/" /> },
            { path: '*', element: <NotFoundPage homePath="/" /> },
          ],
        },
      ],
    },
  ])
}

function renderRouter(importPage: () => Promise<{ default: React.ComponentType }>) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={buildRouter(importPage)} />
    </QueryClientProvider>,
  )
}

describe('appRouter — cold-visit fallback while the index route chunk loads', () => {
  it('shows the shimmering RouteFallback, not a blank screen, while the lazy import is in flight', async () => {
    await mockSettledSession()

    renderRouter(pendingImport)

    // RouteFallback has no role, just aria-busy/aria-live on its wrapper —
    // query by that rather than exact text, since this fallback never
    // finishes resolving in this test.
    const fallback = await screen.findByText('', { selector: '[aria-busy="true"]' })
    expect(fallback).toHaveAttribute('aria-live', 'polite')
  })

  it('replaces the fallback with the real page once the chunk resolves', async () => {
    await mockSettledSession()

    renderRouter(() => Promise.resolve({ default: () => <div>Dashboard tab content</div> }))

    expect(await screen.findByText('Dashboard tab content')).toBeInTheDocument()
    expect(screen.queryByText('', { selector: '[aria-busy="true"]' })).not.toBeInTheDocument()
  })
})
