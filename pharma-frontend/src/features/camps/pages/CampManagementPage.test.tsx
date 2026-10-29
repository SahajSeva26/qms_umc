import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CampManagementPage from './CampManagementPage'
import { useSession } from '@/hooks/useSession'
import type { CampEntity } from '@/types/campReal.types'

vi.mock('@/hooks/useSession')

const { searchScopedCamps, getCamp } = vi.hoisted(() => ({
  searchScopedCamps: vi.fn(async (): Promise<{ success: boolean; message: string; data: { items: unknown[]; count: number } }> =>
    ({ success: true, message: '', data: { items: [], count: 0 } })),
  getCamp: vi.fn(async (): Promise<{ success: boolean; message: string; data: unknown }> =>
    ({ success: true, message: '', data: null })),
}))

vi.mock('@/features/camps/camps.service', () => ({
  pharmaCampsService: { searchScopedCamps, getCamp },
}))

function campFixture(overrides: Partial<CampEntity> = {}): CampEntity {
  return {
    id: 'camp-1', code: 'CMP-001', project: null, doctor: { name: 'Dr Ramesh Sharma', specialization: 'cardiologist' },
    type: 'screening', patientExpectation: 10,
    fo: { code: 'fo-1', name: 'FO One' }, dietitian: null, mr: { code: 'mr-1', name: 'MR One' },
    date: '2026-01-01', timeSlot: null,
    location: { addressLine1: '1 MG Road', city: 'Mumbai', state: 'MH', pincode: '400053' } as CampEntity['location'],
    status: 'confirmed', stageHistory: [], createdAt: '', updatedAt: '',
    ...overrides,
  } as CampEntity
}

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

function mockSession(roleTypeCode: string) {
  vi.mocked(useSession).mockReturnValue({
    isSettled: true,
    isConfirmedUnauthenticated: false,
    session: { user: { id: 'u-1' }, role: { id: 'role-1', code: roleTypeCode, division: 'div-1' }, roleType: { code: roleTypeCode }, tenant: { id: 't-1', name: 'Tenant' }, permissions: ['camp:book'] },
    permissions: ['camp:book'],
    hasPermission: (code: string) => code === 'camp:book',
    hasAnyPermission: (codes: string[]) => codes.includes('camp:book'),
    hasAllPermissions: () => false,
  } as unknown as ReturnType<typeof useSession>)
}

function renderPage(entry = '/pharma/camps') {
  render(
    <MemoryRouter initialEntries={[entry]}>
      <QueryClientProvider client={makeQueryClient()}>
        <CampManagementPage />
      </QueryClientProvider>
    </MemoryRouter>,
  )
}

describe('CampManagementPage — sidebar-level page for all four pharma roles, ported from the pre-split combined app\'s real /camps page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('blocks a non-pharma role-type via PharmaRoleGate', () => {
    mockSession('sales-rep')
    renderPage()

    expect(screen.getByText(/not available for your role/i)).toBeInTheDocument()
  })

  it.each(['pharma-division-head', 'pharma-mr', 'pharma-rsm', 'pharma-asm'])(
    'renders the camp list for %s — all four roles reach the real GET /camps, server-scoped per role',
    async (roleTypeCode) => {
      searchScopedCamps.mockResolvedValue({ success: true, message: '', data: { items: [campFixture()], count: 1 } })
      mockSession(roleTypeCode)
      renderPage()

      expect(await screen.findByText('CMP-001')).toBeInTheDocument()
    },
  )

  it('never shows a "New camp" button, KPI strip, or client/tenant filter — no pharma role holds camp:manage/camp:create', async () => {
    searchScopedCamps.mockResolvedValue({ success: true, message: '', data: { items: [campFixture()], count: 1 } })
    mockSession('pharma-division-head')
    renderPage()

    await screen.findByText('CMP-001')
    expect(screen.queryByRole('button', { name: /new camp/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/^total$/i)).not.toBeInTheDocument()
  })

  it('status ALL with an in-flight status (confirmed/live/requested) renders the card grid, not the table', async () => {
    searchScopedCamps.mockResolvedValue({ success: true, message: '', data: { items: [campFixture({ status: 'confirmed' })], count: 1 } })
    mockSession('pharma-division-head')
    renderPage()

    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: /upcoming/i }))

    // The card view renders a "Details" button per camp; the table view does not.
    expect(await screen.findByRole('button', { name: 'Details' })).toBeInTheDocument()
  })

  it('a settled status (closed/cancelled) renders the table, not the card grid', async () => {
    searchScopedCamps.mockResolvedValue({ success: true, message: '', data: { items: [campFixture({ status: 'closed' })], count: 1 } })
    mockSession('pharma-division-head')
    renderPage()

    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: /completed/i }))

    expect(await screen.findByRole('columnheader', { name: 'Doctor' })).toBeInTheDocument()
    // The card grid's "Details" button has this exact accessible name; the table's expand-row
    // button is named "Expand details for <code>" instead — an exact match distinguishes them.
    expect(screen.queryByRole('button', { name: 'Details' })).not.toBeInTheDocument()
  })

  it('selecting a status tab narrows the search query', async () => {
    searchScopedCamps.mockResolvedValue({ success: true, message: '', data: { items: [], count: 0 } })
    mockSession('pharma-division-head')
    renderPage()
    await vi.waitFor(() => expect(searchScopedCamps).toHaveBeenCalledWith(expect.objectContaining({ status: undefined })))

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /requested/i }))

    await vi.waitFor(() => expect(searchScopedCamps).toHaveBeenCalledWith(expect.objectContaining({ status: 'requested' })))
  })

  it('opens the detail drawer via the camp query param on a card\'s Details click', async () => {
    searchScopedCamps.mockResolvedValue({ success: true, message: '', data: { items: [campFixture({ status: 'confirmed' })], count: 1 } })
    mockSession('pharma-division-head')
    renderPage()

    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: /upcoming/i }))
    await user.click(await screen.findByRole('button', { name: 'Details' }))

    expect(await screen.findByText(/camp · cmp-001/i)).toBeInTheDocument()
  })

  it('shows the empty state when no camps match', async () => {
    searchScopedCamps.mockResolvedValue({ success: true, message: '', data: { items: [], count: 0 } })
    mockSession('pharma-division-head')
    renderPage()

    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: /upcoming/i }))

    expect(await screen.findByText(/no camps found/i)).toBeInTheDocument()
  })

  it('shows a camp-list-shaped skeleton (not plain loading text) before the first response resolves', async () => {
    searchScopedCamps.mockReturnValue(new Promise(() => {}))
    mockSession('pharma-division-head')
    renderPage()

    const skeleton = await screen.findByText('', { selector: '[aria-busy="true"]' })
    expect(skeleton).toBeInTheDocument()
    expect(screen.queryByText(/^loading camps…$/i)).not.toBeInTheDocument()
  })

  it('shows the error state with Retry on failure', async () => {
    searchScopedCamps.mockRejectedValueOnce(new Error('network error'))
    mockSession('pharma-division-head')
    renderPage()

    expect(await screen.findByText(/failed to load camps/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })

  it('a ?camp= deep link for a camp NOT in the current page\'s results still opens the drawer, via GET /camps/:id', async () => {
    // The list's own search never returns this camp — it's on a different page/filter/status.
    searchScopedCamps.mockResolvedValue({ success: true, message: '', data: { items: [], count: 0 } })
    getCamp.mockResolvedValue({ success: true, message: '', data: campFixture({ id: 'camp-99', code: 'CMP-099' }) })
    mockSession('pharma-division-head')
    renderPage('/pharma/camps?camp=camp-99')

    expect(await screen.findByText(/camp · cmp-099/i)).toBeInTheDocument()
    expect(getCamp).toHaveBeenCalledWith('camp-99')
  })

  it('a ?camp= deep link already in the loaded list opens from that row, preferring it over the fetched result', async () => {
    searchScopedCamps.mockResolvedValue({ success: true, message: '', data: { items: [campFixture({ id: 'camp-1', code: 'CMP-001' })], count: 1 } })
    // If GET /camps/:id raced and returned something else before the list settled, the list's own
    // row must still win — proves campFromList is preferred, not merely "sometimes used".
    getCamp.mockResolvedValue({ success: true, message: '', data: campFixture({ id: 'camp-1', code: 'STALE-CODE' }) })
    mockSession('pharma-division-head')
    renderPage('/pharma/camps?camp=camp-1')

    expect(await screen.findByText(/camp · cmp-001/i)).toBeInTheDocument()
    expect(screen.queryByText(/stale-code/i)).not.toBeInTheDocument()
    // The fallback fetch must stay gated until the list query settles — asserting zero calls is
    // only meaningful because it's awaited after the drawer content is already on screen (the list
    // query has long since resolved by then, so there's no remaining window for a late call).
    expect(getCamp).not.toHaveBeenCalled()
  })

  it('shows a loading shell, then Retry, when the deep-linked camp fetch fails', async () => {
    searchScopedCamps.mockResolvedValue({ success: true, message: '', data: { items: [], count: 0 } })
    getCamp.mockRejectedValueOnce(new Error('network error'))
    mockSession('pharma-division-head')
    renderPage('/pharma/camps?camp=camp-99')

    expect(await screen.findByText(/failed to load this camp/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })
})
