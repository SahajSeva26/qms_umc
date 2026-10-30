import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MrDashboardTab from './MrDashboardTab'
import { pharmaCampsService } from '@/features/camps/camps.service'
import type { CampSummary } from '@/types/campReal.types'

vi.mock('@/features/camps/camps.service', () => ({
  pharmaCampsService: {
    myCamps: vi.fn(),
  },
}))

function summaryFixture(overrides: Partial<CampSummary> = {}): CampSummary {
  return {
    totalCamps: 1,
    statusCounts: [{ status: 'requested', count: 1 }],
    typeCounts: [{ type: 'screening', count: 1 }],
    ...overrides,
  }
}

function mockMyCamps(summary: CampSummary, count = 1) {
  vi.mocked(pharmaCampsService.myCamps).mockResolvedValue({
    success: true, message: '', data: { items: [], count, summary },
  })
}

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

function renderTab() {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <MrDashboardTab />
    </QueryClientProvider>,
  )
}

describe('MrDashboardTab (MR Dashboard) — pharma-frontend parity with internal-frontend', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('calls GET /camps/my with a small page (not the old capped-200 /camps search)', async () => {
    mockMyCamps(summaryFixture())

    renderTab()
    await screen.findByText('Total camps')

    expect(pharmaCampsService.myCamps).toHaveBeenCalledWith({ page: '1', limit: '10' })
  })

  it('drives every tile from the server summary, even when the current page has far fewer items than the true total', async () => {
    mockMyCamps(summaryFixture({
      totalCamps: 237,
      statusCounts: [
        { status: 'requested', count: 10 }, { status: 'confirmed', count: 20 },
        { status: 'live', count: 5 }, { status: 'closed', count: 200 },
        { status: 'cancelled', count: 2 }, { status: 'cancelled_charged', count: 0 },
      ],
      typeCounts: [{ type: 'screening', count: 180 }, { type: 'diet', count: 57 }],
    }), 237)

    renderTab()

    expect(await screen.findByText('237')).toBeInTheDocument() // Total camps
    expect(screen.getByText('10')).toBeInTheDocument() // Requested
    expect(screen.getByText('20')).toBeInTheDocument() // Confirmed
    expect(screen.getAllByText('5').length).toBeGreaterThan(0) // Live
    expect(screen.getAllByText('200').length).toBeGreaterThan(0) // Closed
    expect(screen.getAllByText('180').length).toBeGreaterThan(0) // screening type count
    expect(screen.getAllByText('57').length).toBeGreaterThan(0) // diet type count
  })

  it('shows all 6 real CampStatus tiles with their real labels — no fake Upcoming/Ongoing re-bucketing', async () => {
    mockMyCamps(summaryFixture())

    renderTab()
    await screen.findByText('Total camps')

    expect(screen.getByText('Requested')).toBeInTheDocument()
    expect(screen.getByText('Confirmed')).toBeInTheDocument()
    expect(screen.getByText('Live')).toBeInTheDocument()
    expect(screen.getByText('Closed')).toBeInTheDocument()
    expect(screen.getByText('Cancelled')).toBeInTheDocument()
    expect(screen.getByText('Cancelled (Charged)')).toBeInTheDocument()
    expect(screen.queryByText('Upcoming')).not.toBeInTheDocument()
    expect(screen.queryByText('Ongoing')).not.toBeInTheDocument()
  })

  it('shows the real "Camp count by type" card with the 3 real camp types', async () => {
    mockMyCamps(summaryFixture({
      typeCounts: [{ type: 'screening', count: 12 }, { type: 'diet', count: 4 }, { type: 'lab', count: 7 }],
    }))

    renderTab()

    expect(await screen.findByText('Camp count by type')).toBeInTheDocument()
    expect(screen.getByText('Screening')).toBeInTheDocument()
    expect(screen.getByText('Diet')).toBeInTheDocument()
    expect(screen.getByText('Lab')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
    expect(screen.getByText('7')).toBeInTheDocument()
  })

  it('shows 0 for every status/type tile when the summary is empty, not a crash or missing tile', async () => {
    mockMyCamps(summaryFixture({ totalCamps: 0, statusCounts: [], typeCounts: [] }), 0)

    renderTab()

    expect(await screen.findByText('Requested')).toBeInTheDocument()
    expect(screen.getByText('Camp count by type')).toBeInTheDocument()
    expect(screen.getAllByText('0').length).toBeGreaterThan(0)
  })

  it('shows a dashboard-shaped skeleton (not plain loading text) before the first response resolves', async () => {
    vi.mocked(pharmaCampsService.myCamps).mockReturnValue(new Promise(() => {}))
    renderTab()

    const skeleton = await screen.findByText('', { selector: '[aria-busy="true"]' })
    expect(skeleton).toBeInTheDocument()
    expect(screen.queryByText(/loading your camps/i)).not.toBeInTheDocument()
    // Real content (KPI tiles / "Camp count by type") must not render yet either.
    expect(screen.queryByText('Total camps')).not.toBeInTheDocument()
  })

  it('shows the error state with Retry on failure, and Retry re-calls GET /camps/my', async () => {
    vi.mocked(pharmaCampsService.myCamps).mockRejectedValueOnce(new Error('network error'))
    renderTab()

    await screen.findByText(/failed to load your camps/i)
    expect(pharmaCampsService.myCamps).toHaveBeenCalledTimes(1)

    mockMyCamps(summaryFixture())
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /retry/i }))

    expect(await screen.findByText('Total camps')).toBeInTheDocument()
    expect(pharmaCampsService.myCamps).toHaveBeenCalledTimes(2)
  })
})
