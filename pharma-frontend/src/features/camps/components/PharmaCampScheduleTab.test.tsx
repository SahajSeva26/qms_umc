import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PharmaCampScheduleTab from './PharmaCampScheduleTab'
import { pharmaCampsService } from '@/features/camps/camps.service'
import type { CampEntity } from '@/types/campReal.types'

vi.mock('@/features/camps/camps.service', () => ({
  pharmaCampsService: {
    searchScopedCamps: vi.fn(),
    getCamp: vi.fn(),
  },
}))
// Sidesteps RatingSection's own permission/network path entirely — this tab's own behavior
// (filters, pagination, opening the detail drawer) is what's under test here, not the drawer's
// internals (covered by PharmaCampDetailDrawer.test.tsx, including its own permission gating).
vi.mock('@/hooks/useSession', () => ({
  useSession: () => ({ session: { role: { id: 'manager-role' } }, hasAnyPermission: () => false }),
}))

function campFixture(overrides: Partial<CampEntity> = {}): CampEntity {
  return {
    id: 'camp-1', code: 'cmp-000001', project: 'proj-1',
    doctor: 'doc-1', type: 'screening', patientExpectation: 0,
    fo: null, dietitian: null, mr: null, date: '2026-09-15',
    timeSlot: '9am-1pm',
    location: {
      addressLine1: '221 Baker Street', city: 'Pune', state: 'Maharashtra',
      pincode: '411001', coordinates: [73.8567, 18.5204],
    },
    status: 'requested', stageHistory: [],
    createdAt: '', updatedAt: '', ...overrides,
  } as CampEntity
}

function mockSearch(items: CampEntity[], count = items.length) {
  vi.mocked(pharmaCampsService.searchScopedCamps).mockResolvedValue({
    success: true, message: '', data: { items, count },
  })
}

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

function renderTab() {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <PharmaCampScheduleTab />
    </QueryClientProvider>,
  )
}

describe('PharmaCampScheduleTab — HO/RSM/ASM role-aware Camp Schedule', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('status tabs render with no counts (GET /camps has no server summary, unlike /camps/my)', async () => {
    mockSearch([campFixture()])
    renderTab()

    expect(await screen.findByRole('button', { name: /^All$/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Requested$/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Ongoing$/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Completed$/ })).toBeInTheDocument()
  })

  it('clicking a status tab re-queries GET /camps with that status and resets to page 1', async () => {
    mockSearch([campFixture()])
    renderTab()
    await screen.findByText('cmp-000001')

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /^Completed$/ }))

    await waitFor(() => expect(pharmaCampsService.searchScopedCamps).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'closed', page: '1' }),
    ))
  })

  it('"All" sends no status filter', async () => {
    mockSearch([campFixture()])
    renderTab()
    await screen.findByText('cmp-000001')

    const lastCall = vi.mocked(pharmaCampsService.searchScopedCamps).mock.calls.at(-1)![0]
    expect(lastCall.status).toBeUndefined()
  })

  it('paginates via GET /camps\'s own page param, driven by the real count', async () => {
    const page1 = Array.from({ length: 10 }, (_, i) => campFixture({ id: `camp-${i}`, code: `cmp-00000${i}` }))
    mockSearch(page1, 12)
    renderTab()
    await screen.findByText('Page 1 of 2')

    const user = userEvent.setup()
    mockSearch([campFixture({ id: 'camp-11', code: 'cmp-000011' })], 12)
    await user.click(screen.getByRole('button', { name: /next/i }))

    await waitFor(() => expect(pharmaCampsService.searchScopedCamps).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: '2' }),
    ))
  })

  it('clicking "View details" opens the real PharmaCampDetailDrawer for that camp — the sole interactive control on the row, not a competing nested one', async () => {
    mockSearch([campFixture({ code: 'cmp-000016', status: 'closed' })])
    renderTab()

    await screen.findByText('cmp-000016')
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /view details/i }))

    expect(await screen.findByText('Camp · cmp-000016')).toBeInTheDocument()
  })

  it('shows a camp-list-shaped skeleton before the first response resolves', async () => {
    vi.mocked(pharmaCampsService.searchScopedCamps).mockReturnValue(new Promise(() => {}))
    renderTab()

    const skeleton = await screen.findByText('', { selector: '[aria-busy="true"]' })
    expect(skeleton).toBeInTheDocument()
    expect(screen.queryByText(/loading camps/i)).not.toBeInTheDocument()
  })

  it('shows the error state with Retry on failure, and Retry re-calls GET /camps', async () => {
    vi.mocked(pharmaCampsService.searchScopedCamps).mockRejectedValueOnce(new Error('network error'))
    renderTab()

    await screen.findByText(/failed to load camps/i)
    expect(pharmaCampsService.searchScopedCamps).toHaveBeenCalledTimes(1)

    mockSearch([campFixture()])
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /retry/i }))

    await waitFor(() => expect(pharmaCampsService.searchScopedCamps).toHaveBeenCalledTimes(2))
    expect(await screen.findByText('cmp-000001')).toBeInTheDocument()
  })

  it('shows the empty state when the filtered status has no camps', async () => {
    mockSearch([], 0)
    renderTab()

    expect(await screen.findByText(/no camps in this status yet/i)).toBeInTheDocument()
  })

  it('shows an MR column, not an FO-assigned column (distinct from MrCampScheduleTable)', async () => {
    mockSearch([campFixture({ mr: { _id: 'mr-1', code: 'mr-1', name: 'Dr. MR One' } })])
    renderTab()

    expect(await screen.findByText('Dr. MR One')).toBeInTheDocument()
    expect(screen.getByText('MR')).toBeInTheDocument()
  })

  it('each row has exactly one interactive control ("View details") — no nested row-level role="button" competing with it', async () => {
    mockSearch([campFixture()])
    renderTab()
    await screen.findByText('cmp-000001')

    const row = screen.getByText('cmp-000001').closest('tr')!
    expect(row).not.toHaveAttribute('role', 'button')
    expect(row).not.toHaveAttribute('tabindex')
    expect(screen.getAllByRole('button', { name: /view details/i })).toHaveLength(1)
  })
})
