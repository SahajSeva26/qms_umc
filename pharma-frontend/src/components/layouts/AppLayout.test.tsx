import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import AppLayout from './AppLayout'

vi.mock('@/hooks/useSession')

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
}

function tree(path: string) {
  return (
    <QueryClientProvider client={makeQueryClient()}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/*" element={<AppLayout />}>
            <Route path="dashboard" element={<div>Dashboard Page</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

function authenticatedSessionFixture() {
  return {
    user: { id: 'u-1', email: 'a@example.com', firstName: 'Riya', lastName: 'Shah' },
    role: { id: 'role-1', code: 'pharma-mr', name: 'MR' },
    roleType: { id: 'rt-1', code: 'pharma-mr', name: 'pharma-mr' },
    tenant: { id: 't-1', code: 'tenant-1', name: 'Tenant', type: 'customer' },
    permissions: ['camp:book'],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
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

describe('AppLayout — mobile sidebar drawer', () => {
  afterEach(() => {
    // Restores the global jsdom setup's default matchMedia stub, overridden below for the
    // desktop-breakpoint test.
    vi.unstubAllGlobals()
  })

  function mockAuthenticated() {
    return import('@/hooks/useSession').then(({ useSession }) =>
      vi.mocked(useSession).mockReturnValue({
        session: authenticatedSessionFixture(),
        isFetching: false,
        isError: false,
        isConfirmedUnauthenticated: false,
        refetchSession: vi.fn(),
      } as unknown as ReturnType<typeof useSession>),
    )
  }

  // jsdom has no real matchMedia implementation — this stub captures the one listener AppLayout
  // registers so the test can simulate crossing the lg breakpoint via a manual dispatch.
  function mockMatchMedia() {
    const listeners = new Set<(e: MediaQueryListEvent) => void>()
    const mql = {
      matches: false,
      media: '(min-width: 1024px)',
      addEventListener: (_: 'change', listener: (e: MediaQueryListEvent) => void) => listeners.add(listener),
      removeEventListener: (_: 'change', listener: (e: MediaQueryListEvent) => void) => listeners.delete(listener),
    } as unknown as MediaQueryList
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue(mql))
    return {
      crossIntoDesktop: () => {
        const event = { matches: true } as MediaQueryListEvent
        listeners.forEach((listener) => listener(event))
      },
    }
  }

  it('starts closed, opens via the Topbar hamburger, and closes via the backdrop', async () => {
    await mockAuthenticated()

    const user = userEvent.setup()
    render(tree('/dashboard'))
    await screen.findByText('Dashboard Page')

    expect(screen.queryByRole('dialog', { name: /navigation/i })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /open menu/i }))
    // The drawer is lazily mounted (fetched only on first open) — wait for its chunk to resolve.
    expect(await screen.findByRole('dialog', { name: /navigation/i })).toBeInTheDocument()

    await user.click(document.querySelector('.fixed.inset-0.z-40.bg-black\\/40')!)
    expect(screen.queryByRole('dialog', { name: /navigation/i })).not.toBeInTheDocument()
  })

  it('Escape closes the drawer and returns focus to the hamburger button', async () => {
    await mockAuthenticated()

    const user = userEvent.setup()
    render(tree('/dashboard'))
    await screen.findByText('Dashboard Page')

    const toggleButton = screen.getByRole('button', { name: /open menu/i })
    await user.click(toggleButton)
    // base-ui's default initialFocus moves focus to the first tabbable element inside the
    // popup (the Sidebar's own nav link), not the dialog container itself.
    expect(await screen.findByRole('dialog', { name: /navigation/i })).toBeInTheDocument()
    expect(document.activeElement).not.toBe(document.body)

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: /navigation/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /open menu/i })).toHaveFocus()
  })

  it('closes the drawer when the viewport crosses into desktop width, even though CSS already hides it there', async () => {
    const { crossIntoDesktop } = mockMatchMedia()
    await mockAuthenticated()

    const user = userEvent.setup()
    render(tree('/dashboard'))
    await screen.findByText('Dashboard Page')

    await user.click(screen.getByRole('button', { name: /open menu/i }))
    expect(await screen.findByRole('dialog', { name: /navigation/i })).toBeInTheDocument()

    // Simulate the browser crossing the lg breakpoint (e.g. resizing from mobile to desktop
    // width) while the drawer is still open. `lg:hidden` only hides it visually — without the
    // matchMedia listener, the real base-ui Dialog stays logically open and keeps focus-trapping
    // behind an invisible backdrop.
    crossIntoDesktop()

    await waitFor(() => expect(screen.queryByRole('dialog', { name: /navigation/i })).not.toBeInTheDocument())
  })
})
