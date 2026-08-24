import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import type { SessionResponse } from '@/types/accessManagement.types'

vi.mock('@/hooks/useSession')

vi.mock('./Sidebar', () => ({ default: () => <div>Sidebar</div> }))
vi.mock('./Topbar', () => ({ default: () => <div>Topbar</div> }))
vi.mock('@/features/qa-feedback/components/FeedbackWidget', () => ({ default: () => null }))

function sessionFixture(roleTypeCode: string): SessionResponse {
  return {
    user: { id: 'u-1', email: 'a@example.com', firstName: 'a', lastName: 'b' },
    role: { id: 'role-1', code: 'role-code', name: 'Role' },
    roleType: { id: 'rt-1', code: roleTypeCode, name: roleTypeCode },
    tenant: { id: 't-1', code: 'tenant-1', name: 'Tenant', type: 'customer' },
    permissions: ['camp:book'],
  } as unknown as SessionResponse
}

async function renderAt(path: string) {
  const AppLayout = (await import('./AppLayout')).default
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<div>Dashboard Page</div>} />
          <Route path="/pharma" element={<div>Pharma Redirect Page</div>} />
          <Route path="/pharma/rsm" element={<div>RSM Portal Page</div>} />
          <Route path="/pharma/ho" element={<div>HO Portal Page</div>} />
          <Route path="/pharmaceutical-x" element={<div>Pharmaceutical X Page</div>} />
        </Route>
        <Route path="/auth/login" element={<div>Login Page</div>} />
        <Route path="/unauthorized" element={<div>Unauthorized Page</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('AppLayout — session lifecycle', () => {
  it('shows the loading state, never a routing decision, while session is still null and the query is pending', async () => {
    const { useSession } = await import('@/hooks/useSession')
    vi.mocked(useSession).mockReturnValue({
      session: null,
      isFetching: true,
      isError: false,
      isConfirmedUnauthenticated: false,
      refetchSession: vi.fn(),
    } as unknown as ReturnType<typeof useSession>)

    await renderAt('/dashboard')

    expect(screen.queryByText('Dashboard Page')).not.toBeInTheDocument()
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument()
    expect(screen.queryByText('Sidebar')).not.toBeInTheDocument()
  })

  it('redirects to /login on a confirmed 401 with no session', async () => {
    const { useSession } = await import('@/hooks/useSession')
    vi.mocked(useSession).mockReturnValue({
      session: null,
      isFetching: false,
      isError: true,
      isConfirmedUnauthenticated: true,
      refetchSession: vi.fn(),
    } as unknown as ReturnType<typeof useSession>)

    await renderAt('/dashboard')

    expect(await screen.findByText('Login Page')).toBeInTheDocument()
  })

  it('shows SessionRecovery, not a blank screen or a routing guess, on a settled query with no session and no confirmed 401 (e.g. a 429)', async () => {
    const { useSession } = await import('@/hooks/useSession')
    vi.mocked(useSession).mockReturnValue({
      session: null,
      isFetching: false,
      isError: true,
      isConfirmedUnauthenticated: false,
      refetchSession: vi.fn(),
    } as unknown as ReturnType<typeof useSession>)

    await renderAt('/dashboard')

    expect(await screen.findByText("Couldn't confirm your session")).toBeInTheDocument()
  })
})

describe('AppLayout — pharma/QMS route isolation', () => {
  it('redirects a QMS session directly opening /pharma to /unauthorized, never rendering pharma content', async () => {
    const { useSession } = await import('@/hooks/useSession')
    vi.mocked(useSession).mockReturnValue({
      session: sessionFixture('system-admin'),
      isFetching: false,
      isError: false,
      isConfirmedUnauthenticated: false,
      refetchSession: vi.fn(),
    } as unknown as ReturnType<typeof useSession>)

    await renderAt('/pharma')

    expect(await screen.findByText('Unauthorized Page')).toBeInTheDocument()
    expect(screen.queryByText('Pharma Redirect Page')).not.toBeInTheDocument()
  })

  it('redirects a pharma session directly opening /dashboard to their own portal path', async () => {
    const { useSession } = await import('@/hooks/useSession')
    vi.mocked(useSession).mockReturnValue({
      session: sessionFixture('pharma-rsm'),
      isFetching: false,
      isError: false,
      isConfirmedUnauthenticated: false,
      refetchSession: vi.fn(),
    } as unknown as ReturnType<typeof useSession>)

    await renderAt('/dashboard')

    expect(await screen.findByText('RSM Portal Page')).toBeInTheDocument()
    expect(screen.queryByText('Dashboard Page')).not.toBeInTheDocument()
  })

  it('does not redirect a pharma session already on its own portal path — no redirect loop', async () => {
    const { useSession } = await import('@/hooks/useSession')
    vi.mocked(useSession).mockReturnValue({
      session: sessionFixture('pharma-rsm'),
      isFetching: false,
      isError: false,
      isConfirmedUnauthenticated: false,
      refetchSession: vi.fn(),
    } as unknown as ReturnType<typeof useSession>)

    await renderAt('/pharma/rsm')

    expect(await screen.findByText('RSM Portal Page')).toBeInTheDocument()
  })

  it('does not redirect a QMS session on a non-pharma path — normal rendering proceeds', async () => {
    const { useSession } = await import('@/hooks/useSession')
    vi.mocked(useSession).mockReturnValue({
      session: sessionFixture('system-admin'),
      isFetching: false,
      isError: false,
      isConfirmedUnauthenticated: false,
      refetchSession: vi.fn(),
    } as unknown as ReturnType<typeof useSession>)

    await renderAt('/dashboard')

    expect(await screen.findByText('Dashboard Page')).toBeInTheDocument()
    expect(screen.getByText('Sidebar')).toBeInTheDocument()
  })

  it('does not treat an unrelated /pharmaceutical-x path as a pharma path', async () => {
    const { useSession } = await import('@/hooks/useSession')
    vi.mocked(useSession).mockReturnValue({
      session: sessionFixture('pharma-rsm'),
      isFetching: false,
      isError: false,
      isConfirmedUnauthenticated: false,
      refetchSession: vi.fn(),
    } as unknown as ReturnType<typeof useSession>)

    // No matching route for this path — router falls through with nothing
    // rendered inside AppLayout's <Outlet />, but crucially AppLayout itself
    // must not treat this path as "on a pharma path" and skip its own redirect.
    await renderAt('/pharmaceutical-x')

    // A pharma session on a non-pharma, non-exact-match path still redirects to their portal.
    expect(await screen.findByText('RSM Portal Page')).toBeInTheDocument()
  })
})
