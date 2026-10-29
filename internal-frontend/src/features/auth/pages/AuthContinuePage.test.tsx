import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { useSession } from '@/hooks/useSession'
import type { SessionResponse } from '@/types/accessManagement.types'
import { CAMPS_ROUTES } from '@/features/camps/camps.paths'
import { PHARMA_ROUTES } from '@/features/pharma/pharma.constants'
import { EMPLOYEE_ROUTES } from '@/features/access-management/employee/employee.paths'
import { CRM_ROUTES } from '@/features/crm/crm.paths'
import { DOCTORS_ROUTES } from '@/features/doctors/doctors.paths'
import { DASHBOARD_ROUTES } from '@/features/dashboard/dashboard.paths'
import AuthContinuePage from './AuthContinuePage'

vi.mock('@/hooks/useSession')

function sessionFixture(roleTypeCode: string, permissions: string[], tenantType: 'customer' | 'platform' = 'platform'): SessionResponse {
  return {
    user: { id: 'u-1', email: 'a@example.com', firstName: 'a', lastName: 'b' },
    role: { id: 'role-1', code: 'role-code', name: 'Role' },
    roleType: { id: 'rt-1', code: roleTypeCode, name: roleTypeCode },
    tenant: { id: 't-1', code: 'tenant-1', name: 'Tenant', type: tenantType },
    permissions,
  } as unknown as SessionResponse
}

function mockSession(overrides: Partial<{
  isSettled: boolean
  isFetching: boolean
  isError: boolean
  isConfirmedUnauthenticated: boolean
  session: SessionResponse | null
  permissions: string[]
}>) {
  const {
    isSettled = true,
    isFetching = false,
    isError = false,
    isConfirmedUnauthenticated = false,
    session = null,
    permissions = session?.permissions ?? [],
  } = overrides
  vi.mocked(useSession).mockReturnValue({
    isSettled, isFetching, isError, isConfirmedUnauthenticated, session, permissions,
    refetchSession: vi.fn(),
  } as unknown as ReturnType<typeof useSession>)
}

function renderContinuePage(entry = '/auth/continue') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/auth/continue" element={<AuthContinuePage />} />
        <Route path="/auth/login" element={<div>Login page</div>} />
        <Route path="*" element={<div>Landed: no specific match</div>} />
        <Route path={CAMPS_ROUTES.CAMPS} element={<div>Landed: {CAMPS_ROUTES.CAMPS}</div>} />
        <Route path={EMPLOYEE_ROUTES.EMPLOYEES} element={<div>Landed: {EMPLOYEE_ROUTES.EMPLOYEES}</div>} />
        <Route path={PHARMA_ROUTES.PHARMA} element={<div>Landed: {PHARMA_ROUTES.PHARMA}</div>} />
        <Route path={CRM_ROUTES.APPOINTMENTS} element={<div>Landed: {CRM_ROUTES.APPOINTMENTS}</div>} />
        <Route path={DOCTORS_ROUTES.DOCTORS} element={<div>Landed: {DOCTORS_ROUTES.DOCTORS}</div>} />
        <Route path={DASHBOARD_ROUTES.DASHBOARD} element={<div>Landed: {DASHBOARD_ROUTES.DASHBOARD}</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

// A pharma destination is reached via a hard document navigation (window.location.replace), not
// an in-app react-router Navigate — it's a DIFFERENT BUILD under '/pharma/*' (see
// md-files/FRONTEND_SPLIT_ARCHITECTURE.md §5), not a route this router owns. pharmaHref resolves
// to an absolute http://localhost:5174 URL in this (non-PROD) test environment.
const replaceSpy = vi.fn()
const originalLocation = window.location

describe('AuthContinuePage — resolves the post-login landing from the session, not a hard-coded page', () => {
  beforeEach(() => vi.resetAllMocks())
  afterEach(() => {
    Object.defineProperty(window, 'location', { value: originalLocation, writable: true, configurable: true })
    replaceSpy.mockClear()
  })

  it('renders nothing while the session has not settled yet (no guess, no flash)', () => {
    mockSession({ isSettled: false })
    const { container } = renderContinuePage()

    expect(container.textContent).toBe('')
  })

  it('renders nothing (not "Nothing to show yet") while settled-but-session-null and a refetch is in flight — the exact post-login race window useLogin\'s refetchSession creates', () => {
    // isSettled can stay true from an earlier fetch while a new refetch (useLogin's) is in flight and session is momentarily null.
    mockSession({ isSettled: true, isFetching: true, session: null })
    const { container } = renderContinuePage()

    expect(container.textContent).toBe('')
    expect(screen.queryByText(/nothing to show yet/i)).not.toBeInTheDocument()
  })

  it('redirects to login on a confirmed 401', () => {
    mockSession({ isConfirmedUnauthenticated: true, session: null })
    renderContinuePage()

    expect(screen.getByText('Login page')).toBeInTheDocument()
  })

  it('shows SessionRecovery (not a guessed route) on an inconclusive session failure', () => {
    mockSession({ isError: true, session: null })
    renderContinuePage()

    expect(screen.getByText(/couldn't confirm your session/i)).toBeInTheDocument()
  })

  it('a field-officer session lands on Camp Management (camp:search satisfies the Camps gate)', () => {
    const session = sessionFixture('field-officer', ['camp:search'], 'platform')
    mockSession({ session, permissions: session.permissions })
    renderContinuePage()

    expect(screen.getByText(`Landed: ${CAMPS_ROUTES.CAMPS}`)).toBeInTheDocument()
  })

  it('a dietitian session (real default grants: camp:search/camp:get, appointment:search/get/rsvp — no camp:book) lands on Appointments, not the inaccessible tenant default the old FO-only hard-coded fix would have left them on', () => {
    const session = sessionFixture('dietitian', ['camp:search', 'camp:get', 'appointment:search', 'appointment:get', 'appointment:rsvp'], 'platform')
    mockSession({ session, permissions: session.permissions })
    renderContinuePage()

    expect(screen.getByText(`Landed: ${CRM_ROUTES.APPOINTMENTS}`)).toBeInTheDocument()
  })

  it('end-to-end: a real ?returnTo= query string on the URL (not a hand-constructed prop) is read via useSearchParams, validated, and wins over the fallback landing page', () => {
    // Fallback for this session's permission set resolves to Appointments (CRM_ROUTES), a
    // DIFFERENT page from the camp-detail returnTo below — landing on the camp page, not
    // Appointments, proves the query string actually drove the decision rather than the fallback
    // resolver coincidentally landing on the same page the returnTo would have.
    const session = sessionFixture('dietitian', ['appointment:search', 'appointment:get', 'appointment:rsvp', 'camp:search'], 'platform')
    mockSession({ session, permissions: session.permissions })
    renderContinuePage(`/auth/continue?returnTo=${encodeURIComponent('/camps?camp=cmp-1')}`)

    expect(screen.getByText(`Landed: ${CAMPS_ROUTES.CAMPS}`)).toBeInTheDocument()
  })

  it('end-to-end: a real ?returnTo= query string this session is NOT permitted to use is rejected by canUseReturnTo and falls back to the normal landing page (a DIFFERENT page from the rejected returnTo), not followed blindly', () => {
    // No camp:* permission at all — the returnTo below must be rejected outright, landing on this
    // session's real fallback (Appointments), not on Camp Management, proving rejection actually
    // happened rather than merely a lucky fallback/target coincidence.
    const session = sessionFixture('dietitian', ['appointment:search', 'appointment:get', 'appointment:rsvp'], 'platform')
    mockSession({ session, permissions: session.permissions })
    renderContinuePage(`/auth/continue?returnTo=${encodeURIComponent('/camps?camp=cmp-1')}`)

    expect(screen.getByText(`Landed: ${CRM_ROUTES.APPOINTMENTS}`)).toBeInTheDocument()
  })

  it('end-to-end: a real ?returnTo= pointing into the pharma build is read from the URL and carried into the hard document navigation', async () => {
    Object.defineProperty(window, 'location', {
      value: { ...originalLocation, replace: replaceSpy },
      writable: true,
      configurable: true,
    })
    const session = sessionFixture('pharma-mr', ['camp:book'], 'customer')
    mockSession({ session, permissions: session.permissions })
    renderContinuePage(`/auth/continue?returnTo=${encodeURIComponent('/pharma/camps/cmp-1')}`)

    await waitFor(() => expect(replaceSpy).toHaveBeenCalledWith('http://localhost:5174/pharma/camps/cmp-1'))
  })

  it('a pharma-identity session is sent to its own portal BUILD via a hard document navigation (identity routing, not permission routing)', async () => {
    Object.defineProperty(window, 'location', {
      value: { ...originalLocation, replace: replaceSpy },
      writable: true,
      configurable: true,
    })
    const session = sessionFixture('pharma-mr', ['camp:book'], 'customer')
    mockSession({ session, permissions: session.permissions })
    renderContinuePage()

    await waitFor(() => expect(replaceSpy).toHaveBeenCalledWith('http://localhost:5174/pharma/mr'))
  })

  it('renders a visible "Redirecting to your portal…" shell as its own real output — the render body itself must never directly fire a side-effecting navigation', async () => {
    Object.defineProperty(window, 'location', {
      value: { ...originalLocation, replace: replaceSpy },
      writable: true,
      configurable: true,
    })
    const session = sessionFixture('pharma-mr', ['camp:book'], 'customer')
    mockSession({ session, permissions: session.permissions })
    renderContinuePage()

    expect(await screen.findByText('Redirecting to your portal…')).toBeInTheDocument()
    expect(replaceSpy).toHaveBeenCalledWith('http://localhost:5174/pharma/mr')
  })

  it('a misconfigured pharma session (no camp:book) skips its own disabled portal and lands on Doctor Management — the one other item an MR can always reach (no permission gate)', () => {
    const session = sessionFixture('pharma-mr', [], 'customer')
    mockSession({ session, permissions: session.permissions })
    renderContinuePage()

    expect(screen.getByText(`Landed: ${DOCTORS_ROUTES.DOCTORS}`)).toBeInTheDocument()
  })

  it('a misconfigured pharma-rsm session (no camp:book) also skips its own disabled portal and lands on Doctor Management, same as pharma-mr', () => {
    // isPharmaExtraNavItem admits 'camps'/'doctors' for the whole pharma field-force
    // (mr/asm/rsm), not pharma-mr alone.
    const session = sessionFixture('pharma-rsm', [], 'customer')
    mockSession({ session, permissions: session.permissions })
    renderContinuePage()

    expect(screen.getByText(`Landed: ${DOCTORS_ROUTES.DOCTORS}`)).toBeInTheDocument()
  })

  it('a pharma-division-head session with no camp:book resolves to null — the extra-item allowlist excludes it', () => {
    const session = sessionFixture('pharma-division-head', [], 'customer')
    mockSession({ session, permissions: session.permissions })
    renderContinuePage()

    expect(screen.getByText(/nothing to show yet/i)).toBeInTheDocument()
  })

  it('a system:manage session lands on Dashboard — now system:manage-only, and the first section\'s first item once reachable', () => {
    const session = sessionFixture('system-admin', ['system:manage'], 'platform')
    mockSession({ session, permissions: session.permissions })
    renderContinuePage()

    expect(screen.getByText(`Landed: ${DASHBOARD_ROUTES.DASHBOARD}`)).toBeInTheDocument()
  })

  it('even a role type with zero permission-gated grants still resolves somewhere, via the nav items open to any authenticated session (Employees is open to admin-family role types)', () => {
    const session = sessionFixture('admin', [], 'customer')
    mockSession({ session, permissions: session.permissions })
    renderContinuePage()

    expect(screen.getByText(`Landed: ${EMPLOYEE_ROUTES.EMPLOYEES}`)).toBeInTheDocument()
  })
})
