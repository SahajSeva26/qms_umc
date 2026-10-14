import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import type { SessionResponse } from '@/types/accessManagement.types'

vi.mock('@/hooks/useSession')

vi.mock('@/features/pharma/pages/PharmaProjectsPage', () => ({
  default: () => <div>Projects tab content</div>,
}))
vi.mock('@/features/pharma/components/MrBookCampTab', () => ({
  default: () => <div>Book camp tab content</div>,
}))
vi.mock('@/features/pharma/components/PharmaDashboardTab', () => ({
  default: () => <div>Dashboard tab content</div>,
}))
vi.mock('@/features/pharma/components/PharmaDoctorsTab', () => ({
  default: () => <div>Doctors tab content</div>,
}))
vi.mock('@/features/pharma/components/MyCampScheduleTab', () => ({
  default: () => <div>Camp schedule tab content</div>,
}))

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
  vi.mocked(useSession).mockReturnValue({
    session: sessionFixture(),
    isSettled: true,
    isConfirmedUnauthenticated: false,
  } as unknown as ReturnType<typeof useSession>)
}

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

async function renderPage() {
  const MrPortalPage = (await import('./MrPortalPage')).default
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <MemoryRouter>
        <MrPortalPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('MrPortalPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('defaults to the Dashboard tab', async () => {
    await mockSettledSession()
    await renderPage()

    expect(await screen.findByText('Dashboard tab content')).toBeInTheDocument()
    expect(screen.queryByText('Projects tab content')).not.toBeInTheDocument()
    expect(screen.queryByText('Book camp tab content')).not.toBeInTheDocument()
  })

  it('clicking Your projects switches tabs', async () => {
    await mockSettledSession()
    const user = userEvent.setup()
    await renderPage()

    await user.click(await screen.findByRole('button', { name: /your projects/i }))

    expect(screen.getByText('Projects tab content')).toBeInTheDocument()
    expect(screen.queryByText('Dashboard tab content')).not.toBeInTheDocument()
  })

  it('clicking Book camp switches to the booking tab', async () => {
    await mockSettledSession()
    const user = userEvent.setup()
    await renderPage()

    await user.click(await screen.findByRole('button', { name: /book camp/i }))

    expect(screen.getByText('Book camp tab content')).toBeInTheDocument()
    expect(screen.queryByText('Projects tab content')).not.toBeInTheDocument()
  })

  it('clicking Doctors switches to the doctors tab', async () => {
    await mockSettledSession()
    const user = userEvent.setup()
    await renderPage()

    await user.click(await screen.findByRole('button', { name: /^doctors$/i }))

    expect(screen.getByText('Doctors tab content')).toBeInTheDocument()
  })

  it('clicking Camp schedule switches to the schedule tab', async () => {
    await mockSettledSession()
    const user = userEvent.setup()
    await renderPage()

    await user.click(await screen.findByRole('button', { name: /camp schedule/i }))

    expect(screen.getByText('Camp schedule tab content')).toBeInTheDocument()
    expect(screen.queryByText('Dashboard tab content')).not.toBeInTheDocument()
  })

  it('a non-MR pharma role is redirected away by PharmaRoleGate, never seeing any tab', async () => {
    const { useSession } = await import('@/hooks/useSession')
    vi.mocked(useSession).mockReturnValue({
      session: { ...sessionFixture(), roleType: { id: 'rt-2', code: 'pharma-rsm', name: 'pharma-rsm' } },
      isSettled: true,
      isConfirmedUnauthenticated: false,
    } as unknown as ReturnType<typeof useSession>)

    await renderPage()

    expect(screen.queryByText('Dashboard tab content')).not.toBeInTheDocument()
    expect(screen.queryByText('Projects tab content')).not.toBeInTheDocument()
    expect(screen.queryByText('Book camp tab content')).not.toBeInTheDocument()
  })
})
