import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import type { SessionResponse } from '@qms/core'

vi.mock('@/hooks/useSession')

vi.mock('@/features/pharma/components/MrDashboardTab', () => ({
  default: () => <div>Dashboard tab content</div>,
}))
vi.mock('@/features/pharma/components/MrBookCampTab', () => ({
  default: () => <div>Book camp tab content</div>,
}))
vi.mock('@/features/pharma/components/MyCampScheduleTab', () => ({
  default: () => <div>Camp schedule tab content</div>,
}))
vi.mock('@/features/pharma/components/PharmaDoctorsTab', () => ({
  default: () => <div>Doctors tab content</div>,
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

describe('MrPortalPage — pharma-frontend MR portal frame', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('defaults to the Dashboard tab', async () => {
    await mockSettledSession()
    await renderPage()

    expect(await screen.findByText('Dashboard tab content')).toBeInTheDocument()
    expect(screen.queryByText('Not migrated yet')).not.toBeInTheDocument()
  })

  it('shows all 5 tabs — Dashboard, Book camp, Camp schedule, and Doctors have real content, the rest are honestly marked not migrated', async () => {
    await mockSettledSession()
    const user = userEvent.setup()
    await renderPage()

    await user.click(await screen.findByRole('button', { name: /your projects/i }))
    expect(screen.getByText('Not migrated yet')).toBeInTheDocument()
    expect(screen.queryByText('Dashboard tab content')).not.toBeInTheDocument()

    // Book camp, Schedule, and Doctors are all behind a lazy()/Suspense boundary (see
    // MrPortalPage.tsx) — their content mounts asynchronously, hence findByText, not getByText.
    await user.click(screen.getByRole('button', { name: /book camp/i }))
    expect(await screen.findByText('Book camp tab content')).toBeInTheDocument()
    expect(screen.queryByText('Not migrated yet')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /camp schedule/i }))
    expect(await screen.findByText('Camp schedule tab content')).toBeInTheDocument()
    expect(screen.queryByText('Not migrated yet')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^doctors$/i }))
    expect(await screen.findByText('Doctors tab content')).toBeInTheDocument()
    expect(screen.queryByText('Not migrated yet')).not.toBeInTheDocument()
  })

  it('shows the RouteFallback shimmer while the lazy Camp schedule chunk is in flight, not a blank pane', async () => {
    // Re-mock with a never-resolving import() so the test can assert on what's on screen
    // DURING the Suspense boundary, not just after it settles. Proves the P2 fix: Schedule is a
    // real lazy() boundary with its own fallback, not eagerly bundled with Dashboard.
    vi.doMock('@/features/pharma/components/MyCampScheduleTab', () => ({
      default: () => new Promise(() => {}) as never,
    }))
    vi.resetModules()
    await mockSettledSession()
    const user = userEvent.setup()
    await renderPage()

    await user.click(await screen.findByRole('button', { name: /camp schedule/i }))

    // RouteFallback renders aria-busy="true" on its outer wrapper.
    expect(await screen.findByText('', { selector: '[aria-busy="true"]' })).toBeInTheDocument()
  })

  it('clicking back to Dashboard after another tab restores the real content', async () => {
    await mockSettledSession()
    const user = userEvent.setup()
    await renderPage()

    await user.click(await screen.findByRole('button', { name: /your projects/i }))
    expect(screen.getByText('Not migrated yet')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^dashboard$/i }))
    expect(screen.getByText('Dashboard tab content')).toBeInTheDocument()
    expect(screen.queryByText('Not migrated yet')).not.toBeInTheDocument()
  })

  it('a non-MR pharma role never sees the MR tabs or Dashboard content', async () => {
    const { useSession } = await import('@/hooks/useSession')
    vi.mocked(useSession).mockReturnValue({
      session: { ...sessionFixture(), roleType: { id: 'rt-2', code: 'pharma-rsm', name: 'pharma-rsm' } },
      isSettled: true,
      isConfirmedUnauthenticated: false,
    } as unknown as ReturnType<typeof useSession>)

    await renderPage()

    expect(screen.queryByText('Dashboard tab content')).not.toBeInTheDocument()
    expect(screen.queryByText('Not migrated yet')).not.toBeInTheDocument()
    expect(await screen.findByText('Not available for your role')).toBeInTheDocument()
  })
})
