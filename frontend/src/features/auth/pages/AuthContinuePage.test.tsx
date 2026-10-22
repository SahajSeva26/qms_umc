import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
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

function renderContinuePage() {
  return render(
    <MemoryRouter initialEntries={['/auth/continue']}>
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

describe('AuthContinuePage — resolves the post-login landing from the session, not a hard-coded page', () => {
  beforeEach(() => vi.resetAllMocks())

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

  it('a pharma-identity session lands on its own portal path (identity routing, not permission routing)', () => {
    const session = sessionFixture('pharma-mr', ['camp:book'], 'customer')
    mockSession({ session, permissions: session.permissions })
    renderContinuePage()

    expect(screen.getByText(`Landed: ${PHARMA_ROUTES.PHARMA}`)).toBeInTheDocument()
  })

  it('a misconfigured pharma session (no camp:book) skips its own disabled portal and lands on Doctor Management — the one other item an MR can always reach (no permission gate)', () => {
    const session = sessionFixture('pharma-mr', [], 'customer')
    mockSession({ session, permissions: session.permissions })
    renderContinuePage()

    expect(screen.getByText(`Landed: ${DOCTORS_ROUTES.DOCTORS}`)).toBeInTheDocument()
  })

  it('a pharma-mr session with neither camp:book nor any role-type match resolves to null when even the extra-item allowlist is empty', () => {
    // isPharmaExtraNavItem only admits 'camps'/'doctors' for pharma-mr specifically — any other
    // pharma role type with no camp:book has nothing reachable at all.
    const session = sessionFixture('pharma-rsm', [], 'customer')
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
