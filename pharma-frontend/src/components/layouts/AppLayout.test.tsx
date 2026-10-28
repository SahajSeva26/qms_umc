import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import AppLayout from './AppLayout'

vi.mock('@/hooks/useSession')

function tree(path: string) {
  return (
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/*" element={<AppLayout />}>
          <Route path="dashboard" element={<div>Dashboard Page</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  )
}

describe('AppLayout — session recovery latch', () => {
  it('shows SessionRecovery (not a bare spinner) on a settled failure with no confirmed 401', async () => {
    const { useSession } = await import('@/hooks/useSession')
    vi.mocked(useSession).mockReturnValue({
      session: null,
      isFetching: false,
      isError: true,
      isConfirmedUnauthenticated: false,
      refetchSession: vi.fn(),
    } as unknown as ReturnType<typeof useSession>)

    render(tree('/dashboard'))

    expect(await screen.findByText("Couldn't confirm your session")).toBeInTheDocument()
  })

  it('keeps showing SessionRecovery while a retry is in flight, even though TanStack Query resets isError to false the instant the retry starts', async () => {
    const { useSession } = await import('@/hooks/useSession')
    const refetchSession = vi.fn()

    vi.mocked(useSession).mockReturnValue({
      session: null,
      isFetching: false,
      isError: true,
      isConfirmedUnauthenticated: false,
      refetchSession,
    } as unknown as ReturnType<typeof useSession>)

    const { rerender } = render(tree('/dashboard'))
    expect(await screen.findByText("Couldn't confirm your session")).toBeInTheDocument()

    // Simulate the retry: React Query clears isError the moment the refetch
    // starts, but the session is still null and the query is now fetching.
    // Without the sawSessionError latch this falls through to the bare
    // SessionLoading spinner, silently dropping the "retrying" UI/context.
    vi.mocked(useSession).mockReturnValue({
      session: null,
      isFetching: true,
      isError: false,
      isConfirmedUnauthenticated: false,
      refetchSession,
    } as unknown as ReturnType<typeof useSession>)

    rerender(tree('/dashboard'))

    expect(await screen.findByText("Couldn't confirm your session")).toBeInTheDocument()
  })

  it('clears the latch and renders normally once a session is actually obtained after a retry', async () => {
    const { useSession } = await import('@/hooks/useSession')
    const refetchSession = vi.fn()

    vi.mocked(useSession).mockReturnValue({
      session: null,
      isFetching: false,
      isError: true,
      isConfirmedUnauthenticated: false,
      refetchSession,
    } as unknown as ReturnType<typeof useSession>)

    const { rerender } = render(tree('/dashboard'))
    expect(await screen.findByText("Couldn't confirm your session")).toBeInTheDocument()

    vi.mocked(useSession).mockReturnValue({
      session: {
        user: { id: 'u-1', email: 'a@example.com', firstName: 'a', lastName: 'b' },
        role: { id: 'role-1', code: 'role-code', name: 'Role' },
        roleType: { id: 'rt-1', code: 'pharma-mr', name: 'pharma-mr' },
        tenant: { id: 't-1', code: 'tenant-1', name: 'Tenant', type: 'customer' },
        permissions: [],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
      isFetching: false,
      isError: false,
      isConfirmedUnauthenticated: false,
      refetchSession,
    } as unknown as ReturnType<typeof useSession>)

    rerender(tree('/dashboard'))

    expect(await screen.findByText('Dashboard Page')).toBeInTheDocument()
    expect(screen.queryByText("Couldn't confirm your session")).not.toBeInTheDocument()
  })
})

describe('AppLayout — cross-origin login redirect', () => {
  let originalHref: string

  beforeEach(() => {
    originalHref = window.location.href
    // jsdom's window.location.href setter actually attempts navigation and
    // logs a "Not implemented" error — stub it so the redirect is observable
    // without jsdom noise, and so we can assert it did/didn't fire.
    Object.defineProperty(window, 'location', {
      value: { ...window.location, href: originalHref },
      writable: true,
    })
  })

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      value: { ...window.location, href: originalHref },
      writable: true,
    })
  })

  it('does not redirect on a temporary session failure (429/5xx) — only a confirmed 401 may redirect', async () => {
    const { useSession } = await import('@/hooks/useSession')
    vi.mocked(useSession).mockReturnValue({
      session: null,
      isFetching: false,
      isError: true,
      isConfirmedUnauthenticated: false,
      refetchSession: vi.fn(),
    } as unknown as ReturnType<typeof useSession>)

    render(tree('/dashboard'))

    await screen.findByText("Couldn't confirm your session")
    // Give any stray effect a tick to run before asserting its absence.
    await waitFor(() => expect(window.location.href).toBe(originalHref))
  })

  it('redirects to the internal app login only once isConfirmedUnauthenticated is true', async () => {
    const { useSession } = await import('@/hooks/useSession')
    vi.mocked(useSession).mockReturnValue({
      session: null,
      isFetching: false,
      isError: true,
      isConfirmedUnauthenticated: true,
      refetchSession: vi.fn(),
    } as unknown as ReturnType<typeof useSession>)

    render(tree('/dashboard'))

    await waitFor(() => expect(window.location.href).toContain('/auth/login'))
  })
})
