import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import PharmaPortalPage from './PharmaPortalPage'
import type { SessionResponse } from '@/types/accessManagement.types'

vi.mock('@/hooks/useSession')

vi.mock('@/features/pharma/pages/PharmaProjectsPage', () => ({ default: () => <div>Projects tab content</div> }))
vi.mock('@/features/pharma/components/MrBookCampTab', () => ({ default: () => <div>Book camp tab content</div> }))
vi.mock('@/features/pharma/components/PharmaDashboardTab', () => ({ default: () => <div>Generic dashboard tab content</div> }))
vi.mock('@/features/pharma/components/MrDashboardTab', () => ({ default: () => <div>MR dashboard tab content</div> }))
vi.mock('@/features/pharma/components/PharmaDoctorsTab', () => ({ default: () => <div>Doctors tab content</div> }))
vi.mock('@/features/pharma/components/PharmaMyTeamTab', () => ({ default: () => <div>My Team tab content</div> }))
vi.mock('@/features/pharma/components/MyCampScheduleTab', () => ({ default: () => <div>Camp schedule tab content</div> }))

function sessionFixture(roleTypeCode: string): SessionResponse {
  return {
    user: { id: 'u-1', email: 'a@example.com', firstName: 'a', lastName: 'b' },
    role: { id: 'role-1', code: roleTypeCode, name: roleTypeCode, division: 'div-1' },
    roleType: { id: 'rt-1', code: roleTypeCode, name: roleTypeCode },
    tenant: { id: 't-1', code: 'tenant-1', name: 'Tenant', type: 'customer' },
    permissions: ['camp:book'],
  } as unknown as SessionResponse
}

async function mockSettledSession(roleTypeCode: string) {
  const { useSession } = await import('@/hooks/useSession')
  vi.mocked(useSession).mockReturnValue({
    session: sessionFixture(roleTypeCode),
    isSettled: true,
    isConfirmedUnauthenticated: false,
  } as unknown as ReturnType<typeof useSession>)
}

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

function renderPortal(roleTypeCode: string) {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <MemoryRouter>
        <PharmaPortalPage roleTypeCode={roleTypeCode} portalLabel={roleTypeCode} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

// GET /camps/my (behind Camp schedule) is only accessible to pharma-mr among pharma roles — the
// tab must not even render for the other 3, not just redirect once clicked.
describe('PharmaPortalPage — Camp schedule tab visibility', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('shows Camp schedule for pharma-mr', async () => {
    await mockSettledSession('pharma-mr')
    renderPortal('pharma-mr')

    expect(await screen.findByRole('button', { name: /camp schedule/i })).toBeInTheDocument()
  })

  it.each(['pharma-rsm', 'pharma-asm', 'pharma-division-head'])('hides Camp schedule for %s', async (roleTypeCode) => {
    await mockSettledSession(roleTypeCode)
    renderPortal(roleTypeCode)

    await screen.findByRole('button', { name: /^dashboard$/i })
    expect(screen.queryByRole('button', { name: /camp schedule/i })).not.toBeInTheDocument()
  })
})

// GET /camps/my's RoleGuard admits only Field Officer, Dietitian, and Pharma MR (camp.routes.ts) —
// HO/RSM/ASM must never be routed to MrDashboardTab (which calls /camps/my), or they 403 on load.
describe('PharmaPortalPage — Dashboard tab routes to the correct component per role', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('renders MrDashboardTab (GET /camps/my) for pharma-mr', async () => {
    await mockSettledSession('pharma-mr')
    renderPortal('pharma-mr')

    expect(await screen.findByText('MR dashboard tab content')).toBeInTheDocument()
    expect(screen.queryByText('Generic dashboard tab content')).not.toBeInTheDocument()
  })

  it.each(['pharma-rsm', 'pharma-asm', 'pharma-division-head'])(
    'renders the generic PharmaDashboardTab (GET /camps) for %s, never MrDashboardTab',
    async (roleTypeCode) => {
      await mockSettledSession(roleTypeCode)
      renderPortal(roleTypeCode)

      expect(await screen.findByText('Generic dashboard tab content')).toBeInTheDocument()
      expect(screen.queryByText('MR dashboard tab content')).not.toBeInTheDocument()
    },
  )
})

// HO/RSM/ASM see their downline hierarchy (PharmaMyTeamTab) instead of the doctor registry; MR
// keeps the original Doctors tab unchanged — a locked product decision, not an oversight.
describe('PharmaPortalPage — Doctors tab is swapped for My Team, except for MR', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('shows "Doctors" and renders PharmaDoctorsTab for pharma-mr', async () => {
    await mockSettledSession('pharma-mr')
    renderPortal('pharma-mr')

    const tabButton = await screen.findByRole('button', { name: /^doctors$/i })
    expect(screen.queryByRole('button', { name: /my team/i })).not.toBeInTheDocument()

    await userEvent.click(tabButton)
    expect(await screen.findByText('Doctors tab content')).toBeInTheDocument()
  })

  it.each(['pharma-rsm', 'pharma-asm', 'pharma-division-head'])(
    'shows "My Team" and renders PharmaMyTeamTab for %s',
    async (roleTypeCode) => {
      await mockSettledSession(roleTypeCode)
      renderPortal(roleTypeCode)

      const tabButton = await screen.findByRole('button', { name: /my team/i })
      expect(screen.queryByRole('button', { name: /^doctors$/i })).not.toBeInTheDocument()

      await userEvent.click(tabButton)
      expect(await screen.findByText('My Team tab content')).toBeInTheDocument()
    },
  )
})
