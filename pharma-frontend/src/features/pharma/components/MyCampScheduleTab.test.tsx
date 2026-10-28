import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import MyCampScheduleTab from './MyCampScheduleTab'
import { pharmaCampsService } from '@/features/pharma/pharmaCamps.service'
import type { CampEntity, CampSummary } from '@/types/campReal.types'

vi.mock('@/features/pharma/pharmaCamps.service', () => ({
  pharmaCampsService: {
    myCamps: vi.fn(),
    getCamp: vi.fn(),
  },
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

function summaryFixture(overrides: Partial<CampSummary> = {}): CampSummary {
  return {
    totalCamps: 1,
    statusCounts: [{ status: 'requested', count: 1 }],
    typeCounts: [{ type: 'screening', count: 1 }],
    ...overrides,
  }
}

function mockMyCamps(items: CampEntity[], summary: CampSummary, count = items.length) {
  vi.mocked(pharmaCampsService.myCamps).mockResolvedValue({
    success: true, message: '', data: { items, count, summary },
  })
}

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

function renderTab() {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <MemoryRouter>
        <MyCampScheduleTab />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('MyCampScheduleTab — pharma-frontend parity with internal-frontend', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('renders the status pills with the server-computed summary counts, not the current page size', async () => {
    const camp = campFixture()
    // The page itself has only 1 item, but the summary reports the caller's real totals across
    // every page — the pills must read from summary, not from items.length.
    mockMyCamps([camp], summaryFixture({
      totalCamps: 15,
      statusCounts: [
        { status: 'requested', count: 2 }, { status: 'confirmed', count: 2 },
        { status: 'live', count: 2 }, { status: 'closed', count: 9 },
      ],
    }), 15)

    renderTab()

    expect(await screen.findByRole('button', { name: /^All\s*15$/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Requested\s*2$/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Ongoing\s*2$/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Upcoming\s*2$/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Completed\s*9$/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Cancelled\s*0$/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Cancelled but charged\s*0$/ })).toBeInTheDocument()
  })

  it('clicking a status pill re-queries GET /camps/my with that status and resets to page 1', async () => {
    mockMyCamps([campFixture()], summaryFixture())
    renderTab()
    await screen.findByText('cmp-000001')

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /^Completed/ }))

    await waitFor(() => expect(pharmaCampsService.myCamps).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'closed', page: '1' }),
    ))
  })

  it('"All" sends no status filter', async () => {
    mockMyCamps([campFixture()], summaryFixture())
    renderTab()
    await screen.findByText('cmp-000001')

    const lastCall = vi.mocked(pharmaCampsService.myCamps).mock.calls.at(-1)![0]
    expect(lastCall.status).toBeUndefined()
  })

  it('paginates via GET /camps/my\'s own page param, driven by the real count (not the current page length)', async () => {
    const page1 = Array.from({ length: 10 }, (_, i) => campFixture({ id: `camp-${i}`, code: `cmp-00000${i}` }))
    mockMyCamps(page1, summaryFixture({ totalCamps: 12 }), 12)
    renderTab()
    await screen.findByText('Page 1 of 2')

    const user = userEvent.setup()
    mockMyCamps([campFixture({ id: 'camp-11', code: 'cmp-000011' })], summaryFixture({ totalCamps: 12 }), 12)
    await user.click(screen.getByRole('button', { name: /next/i }))

    await waitFor(() => expect(pharmaCampsService.myCamps).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: '2' }),
    ))
  })

  it('a page change keeps the existing rows on screen (dimmed) instead of blanking the table and replaying the full skeleton', async () => {
    const page1 = Array.from({ length: 10 }, (_, i) => campFixture({ id: `camp-${i}`, code: `cmp-00000${i}` }))
    mockMyCamps(page1, summaryFixture({ totalCamps: 12 }), 12)
    renderTab()
    await screen.findByText('Page 1 of 2')

    let resolvePage2!: (v: Awaited<ReturnType<typeof pharmaCampsService.myCamps>>) => void
    vi.mocked(pharmaCampsService.myCamps).mockReturnValue(new Promise((resolve) => { resolvePage2 = resolve }))

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /next/i }))

    // Page 1's row is still in the DOM mid-refetch — not replaced by the full-skeleton shimmer
    // (which renders 6 bare placeholder rows with no real camp text, instead of the real table).
    expect(screen.getByText('cmp-000000')).toBeInTheDocument()
    // Pagination is disabled while the refetch is in flight, to prevent a double page-jump.
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled()

    resolvePage2({
      success: true, message: '', data: { items: [campFixture({ id: 'camp-11', code: 'cmp-000011' })], count: 12, summary: summaryFixture({ totalCamps: 12 }) },
    })
    await screen.findByText('cmp-000011')
  })

  it('clicking a row opens the real PharmaCampDetailDrawer for that camp', async () => {
    mockMyCamps([campFixture({ code: 'cmp-000016', status: 'closed' })], summaryFixture())
    renderTab()

    const user = userEvent.setup()
    await user.click(await screen.findByText('cmp-000016'))

    expect(await screen.findByText('Camp · cmp-000016')).toBeInTheDocument()
  })

  it('shows a camp-list-shaped skeleton (not plain loading text) before the first response resolves', async () => {
    vi.mocked(pharmaCampsService.myCamps).mockReturnValue(new Promise(() => {}))
    renderTab()

    const skeleton = await screen.findByText('', { selector: '[aria-busy="true"]' })
    expect(skeleton).toBeInTheDocument()
    expect(screen.queryByText(/loading your camps/i)).not.toBeInTheDocument()
  })

  it('shows the error state with Retry on failure, and Retry re-calls GET /camps/my', async () => {
    vi.mocked(pharmaCampsService.myCamps).mockRejectedValueOnce(new Error('network error'))
    renderTab()

    await screen.findByText(/failed to load your camps/i)
    expect(pharmaCampsService.myCamps).toHaveBeenCalledTimes(1)

    mockMyCamps([campFixture()], summaryFixture())
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /retry/i }))

    await waitFor(() => expect(pharmaCampsService.myCamps).toHaveBeenCalledTimes(2))
    expect(await screen.findByText('cmp-000001')).toBeInTheDocument()
  })

  it('shows the empty state when the filtered status has no camps', async () => {
    mockMyCamps([], summaryFixture({ totalCamps: 0, statusCounts: [] }), 0)
    renderTab()

    expect(await screen.findByText(/no camps in this status yet/i)).toBeInTheDocument()
  })
})
