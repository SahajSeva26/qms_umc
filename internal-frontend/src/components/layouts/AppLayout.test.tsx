import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import type { SessionResponse } from '@/types/accessManagement.types'

vi.mock('@/hooks/useSession')

vi.mock('./Sidebar', () => ({ default: () => <div>Sidebar</div> }))
vi.mock('./Topbar', () => ({ default: () => <div>Topbar</div> }))
vi.mock('@/features/qa-feedback/components/FeedbackWidget', () => ({ default: () => null }))

// A pharma destination is now reached via a hard document navigation (window.location.replace),
// not an in-app react-router Navigate — it's a DIFFERENT BUILD under '/pharma/*', not a route this
// router owns (see md-files/FRONTEND_SPLIT_ARCHITECTURE.md §5). pharmaHref resolves to an absolute
// http://localhost:5174 URL in this (non-PROD) test environment — see config/env.ts's
// pharmaDevOrigin(). Assert the navigation call itself, not rendered page content that can never
// actually appear (jsdom doesn't follow window.location.replace).
const replaceSpy = vi.fn()
const originalLocation = window.location

afterEach(() => {
  Object.defineProperty(window, 'location', { value: originalLocation, writable: true, configurable: true })
  replaceSpy.mockClear()
})

function mockLocationReplace() {
  Object.defineProperty(window, 'location', {
    value: { ...originalLocation, replace: replaceSpy },
    writable: true,
    configurable: true,
  })
}

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
          {/* No '/pharma/*' routes here — intentionally, matching the real router (see
              app/router.tsx's own note): internal-frontend no longer registers any '/pharma/*'
              route at all, so a pharma session is ALWAYS sent out via the hard document
              navigation below, regardless of which internal path it's currently on. */}
          <Route path="/pharmaceutical-x" element={<div>Pharmaceutical X Page</div>} />
          <Route path="/camps" element={<div>Camp Management Page</div>} />
          <Route path="/camps/screening" element={<div>Screening Camps Page</div>} />
          <Route path="/camps/diet" element={<div>Diet Camps Page</div>} />
          <Route path="/camps/new" element={<div>New Camp Page</div>} />
          <Route path="/camps/cmp-1" element={<div>Camp Detail Page</div>} />
          <Route path="/doctors" element={<div>Doctor Management Page</div>} />
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
  // A non-pharma session never triggers the pharmaMeta redirect branch at all — getPharmaRoleMeta
  // returns null for it, regardless of the current path. This router also no longer registers any
  // '/pharma/*' route for internal-frontend to defend against in the first place (the deployment
  // proxy routes that prefix to the separately-deployed pharma build before this app ever sees the
  // request) — so there is no "QMS session hits /pharma, gets redirected to /unauthorized" case
  // left to test here; a bad in-app URL for a QMS session is the router's own catch-all's concern,
  // not AppLayout's.
  it('a non-pharma session never triggers the pharma redirect, on any path, and makes no navigation call', async () => {
    mockLocationReplace()
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
    expect(replaceSpy).not.toHaveBeenCalled()
  })

  it('redirects a pharma session directly opening /dashboard to their own portal build via a hard document navigation', async () => {
    mockLocationReplace()
    const { useSession } = await import('@/hooks/useSession')
    vi.mocked(useSession).mockReturnValue({
      session: sessionFixture('pharma-rsm'),
      isFetching: false,
      isError: false,
      isConfirmedUnauthenticated: false,
      refetchSession: vi.fn(),
    } as unknown as ReturnType<typeof useSession>)

    await renderAt('/dashboard')

    await waitFor(() => expect(replaceSpy).toHaveBeenCalledWith('http://localhost:5174/pharma/rsm'))
    expect(screen.queryByText('Dashboard Page')).not.toBeInTheDocument()
  })

  // The navigation itself must run in a useEffect, not directly in the render body — a side
  // effect with a real-world consequence (an actual browser navigation) must not execute during
  // render, which React may call more than once for the same commit (Strict Mode double-invoke,
  // concurrent rendering) or discard without committing at all. Proven here by asserting the
  // "Redirecting…" shell is a REAL, visible render output, not just an inference from the
  // navigation call — if the navigation ran directly in the render body instead (call
  // window.location.replace, then `return null`), this component would never produce visible
  // "Redirecting…" text at all; there would be nothing here to find.
  it('renders a visible "Redirecting to your portal…" shell as its own real output — the render body itself must never directly fire a side-effecting navigation', async () => {
    mockLocationReplace()
    const { useSession } = await import('@/hooks/useSession')
    vi.mocked(useSession).mockReturnValue({
      session: sessionFixture('pharma-mr'),
      isFetching: false,
      isError: false,
      isConfirmedUnauthenticated: false,
      refetchSession: vi.fn(),
    } as unknown as ReturnType<typeof useSession>)

    await renderAt('/dashboard')

    expect(await screen.findByText('Redirecting to your portal…')).toBeInTheDocument()
    expect(replaceSpy).toHaveBeenCalledWith('http://localhost:5174/pharma/mr')
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

  it('redirects a pharma session on an unrelated /pharmaceutical-x path too — there is no path-string special-casing left, only the field-force exception list', async () => {
    mockLocationReplace()
    const { useSession } = await import('@/hooks/useSession')
    vi.mocked(useSession).mockReturnValue({
      session: sessionFixture('pharma-rsm'),
      isFetching: false,
      isError: false,
      isConfirmedUnauthenticated: false,
      refetchSession: vi.fn(),
    } as unknown as ReturnType<typeof useSession>)

    await renderAt('/pharmaceutical-x')

    await waitFor(() => expect(replaceSpy).toHaveBeenCalledWith('http://localhost:5174/pharma/rsm'))
  })

  // Pharma field-force's (MR/ASM/RSM) one exception: they also get the real (non-pharma) Camp
  // Management page, own-scoped server-side.
  it.each([
    ['pharma-mr', 'MR Portal Page'],
    ['pharma-asm', 'ASM Portal Page'],
    ['pharma-rsm', 'RSM Portal Page'],
  ])('does not redirect %s away from /camps — the one allowed non-pharma path', async (roleTypeCode) => {
    const { useSession } = await import('@/hooks/useSession')
    vi.mocked(useSession).mockReturnValue({
      session: sessionFixture(roleTypeCode),
      isFetching: false,
      isError: false,
      isConfirmedUnauthenticated: false,
      refetchSession: vi.fn(),
    } as unknown as ReturnType<typeof useSession>)

    await renderAt('/camps')

    expect(await screen.findByText('Camp Management Page')).toBeInTheDocument()
  })

  it('still redirects pharma-division-head (not field-force) away from /camps, back to their own portal build', async () => {
    mockLocationReplace()
    const { useSession } = await import('@/hooks/useSession')
    vi.mocked(useSession).mockReturnValue({
      session: sessionFixture('pharma-division-head'),
      isFetching: false,
      isError: false,
      isConfirmedUnauthenticated: false,
      refetchSession: vi.fn(),
    } as unknown as ReturnType<typeof useSession>)

    await renderAt('/camps')

    await waitFor(() => expect(replaceSpy).toHaveBeenCalledWith('http://localhost:5174/pharma/ho'))
    expect(screen.queryByText('Camp Management Page')).not.toBeInTheDocument()
  })

  // The exceptions are exactly pathname === '/camps'/'/camps/diet' — not a startsWith prefix
  // match, so pharma-mr must still be bounced off every other /camps/* route (screening/new/detail).
  it.each([
    ['/camps/screening', 'Screening Camps Page'],
    ['/camps/new', 'New Camp Page'],
    ['/camps/cmp-1', 'Camp Detail Page'],
  ])('redirects pharma-mr away from %s to its own portal build, not the combined Camp Management exception', async (path, pageText) => {
    mockLocationReplace()
    const { useSession } = await import('@/hooks/useSession')
    vi.mocked(useSession).mockReturnValue({
      session: sessionFixture('pharma-mr'),
      isFetching: false,
      isError: false,
      isConfirmedUnauthenticated: false,
      refetchSession: vi.fn(),
    } as unknown as ReturnType<typeof useSession>)

    await renderAt(path)

    await waitFor(() => expect(replaceSpy).toHaveBeenCalledWith('http://localhost:5174/pharma/mr'))
    expect(screen.queryByText(pageText)).not.toBeInTheDocument()
  })

  // Same exception pattern as Camp Management, extended to Diet Camps.
  it.each([
    ['pharma-mr', 'MR Portal Page'],
    ['pharma-asm', 'ASM Portal Page'],
    ['pharma-rsm', 'RSM Portal Page'],
  ])('does not redirect %s away from /camps/diet — the pharma field-force exception', async (roleTypeCode) => {
    const { useSession } = await import('@/hooks/useSession')
    vi.mocked(useSession).mockReturnValue({
      session: sessionFixture(roleTypeCode),
      isFetching: false,
      isError: false,
      isConfirmedUnauthenticated: false,
      refetchSession: vi.fn(),
    } as unknown as ReturnType<typeof useSession>)

    await renderAt('/camps/diet')

    expect(await screen.findByText('Diet Camps Page')).toBeInTheDocument()
  })

  it('still redirects pharma-division-head (not field-force) away from /camps/diet, back to their own portal build', async () => {
    mockLocationReplace()
    const { useSession } = await import('@/hooks/useSession')
    vi.mocked(useSession).mockReturnValue({
      session: sessionFixture('pharma-division-head'),
      isFetching: false,
      isError: false,
      isConfirmedUnauthenticated: false,
      refetchSession: vi.fn(),
    } as unknown as ReturnType<typeof useSession>)

    await renderAt('/camps/diet')

    await waitFor(() => expect(replaceSpy).toHaveBeenCalledWith('http://localhost:5174/pharma/ho'))
    expect(screen.queryByText('Diet Camps Page')).not.toBeInTheDocument()
  })

  // Same exception pattern, extended to Doctor Management.
  it.each([
    ['pharma-mr', 'MR Portal Page'],
    ['pharma-asm', 'ASM Portal Page'],
    ['pharma-rsm', 'RSM Portal Page'],
  ])('does not redirect %s away from /doctors — the other allowed non-pharma path', async (roleTypeCode) => {
    const { useSession } = await import('@/hooks/useSession')
    vi.mocked(useSession).mockReturnValue({
      session: sessionFixture(roleTypeCode),
      isFetching: false,
      isError: false,
      isConfirmedUnauthenticated: false,
      refetchSession: vi.fn(),
    } as unknown as ReturnType<typeof useSession>)

    await renderAt('/doctors')

    expect(await screen.findByText('Doctor Management Page')).toBeInTheDocument()
  })

  it('still redirects pharma-division-head (not field-force) away from /doctors, back to their own portal build', async () => {
    mockLocationReplace()
    const { useSession } = await import('@/hooks/useSession')
    vi.mocked(useSession).mockReturnValue({
      session: sessionFixture('pharma-division-head'),
      isFetching: false,
      isError: false,
      isConfirmedUnauthenticated: false,
      refetchSession: vi.fn(),
    } as unknown as ReturnType<typeof useSession>)

    await renderAt('/doctors')

    await waitFor(() => expect(replaceSpy).toHaveBeenCalledWith('http://localhost:5174/pharma/ho'))
    expect(screen.queryByText('Doctor Management Page')).not.toBeInTheDocument()
  })
})
