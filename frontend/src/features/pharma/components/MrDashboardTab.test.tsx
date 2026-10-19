import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MrDashboardTab from './MrDashboardTab'
import { pharmaCampsService } from '@/features/pharma/pharmaCamps.service'
import type { CampEntity, CampSummary } from '@/types/campReal.types'

vi.mock('@/features/pharma/pharmaCamps.service', () => ({
  pharmaCampsService: {
    myCamps: vi.fn(),
  },
}))

function campFixture(overrides: Partial<CampEntity> = {}): CampEntity {
  return {
    id: 'camp-1', code: 'cmp-000001', tenant: 't-1', division: 'div-1', project: 'proj-1',
    doctor: 'doc-1', type: 'screening', billingType: 'billable', patientExpectation: 0,
    fo: null, mr: null, date: '2026-09-15',
    timeSlot: '9am-1pm',
    location: {
      addressLine1: '221 Baker Street', city: 'Pune', state: 'Maharashtra',
      pincode: '411001', coordinates: [73.8567, 18.5204],
    },
    devices: [], status: 'requested', stageHistory: [],
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
      <MrDashboardTab />
    </QueryClientProvider>,
  )
}

describe('MrDashboardTab (MR Dashboard)', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('calls GET /camps/my with a small page (not the old capped-200 /camps search)', async () => {
    mockMyCamps([campFixture()], summaryFixture())

    renderTab()
    await screen.findByText('Total camps')

    expect(pharmaCampsService.myCamps).toHaveBeenCalledWith({ page: '1', limit: '10' })
  })

  it('drives every tile from the server summary, even when the current page has far fewer items than the true total', async () => {
    // Only 1 item on this page, but the summary reports the MR's REAL full-history totals — every
    // number shown must come from summary, never from items.length.
    mockMyCamps([campFixture()], summaryFixture({
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
    expect(screen.getAllByText('2').length).toBeGreaterThan(0) // Camp types (screening+diet) and/or Cancelled count
    expect(screen.getByText('10')).toBeInTheDocument() // Requested
    expect(screen.getByText('20')).toBeInTheDocument() // Confirmed
    expect(screen.getAllByText('5').length).toBeGreaterThan(0) // Live
    expect(screen.getAllByText('200').length).toBeGreaterThan(0) // Closed
    expect(screen.getAllByText('180').length).toBeGreaterThan(0) // screening type count (tile value appears once, type card once)
    expect(screen.getAllByText('57').length).toBeGreaterThan(0) // diet type count
  })

  it('shows all 6 real CampStatus tiles with their real labels (Requested/Confirmed/Live/Closed/Cancelled/Cancelled (Charged)) — no fake Upcoming/Ongoing re-bucketing', async () => {
    mockMyCamps([campFixture()], summaryFixture())

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
    mockMyCamps([campFixture()], summaryFixture({
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

  it('never renders the old "sample, not your full history" disclaimer', async () => {
    mockMyCamps([campFixture()], summaryFixture({ totalCamps: 500 }), 500)

    renderTab()
    await screen.findByText('Total camps')

    expect(screen.queryByText(/sample, not your full history/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/showing your latest/i)).not.toBeInTheDocument()
  })

  it('never shows Unique doctors, Total patients, Brand-wise Rx, or a pending-rating banner — none have a real backend equivalent', async () => {
    mockMyCamps([campFixture()], summaryFixture())

    renderTab()
    await screen.findByText('Total camps')

    expect(screen.queryByText('Unique doctors')).not.toBeInTheDocument()
    expect(screen.queryByText('Total patients')).not.toBeInTheDocument()
    expect(screen.queryByText(/brand-wise rx/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/booking is locked/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/rate now/i)).not.toBeInTheDocument()
  })

  it('shows 0 for every status/type tile when the summary is empty, not a crash or missing tile', async () => {
    mockMyCamps([], summaryFixture({ totalCamps: 0, statusCounts: [], typeCounts: [] }), 0)

    renderTab()

    expect(await screen.findByText('Requested')).toBeInTheDocument()
    expect(screen.getByText('Camp count by type')).toBeInTheDocument()
    expect(screen.getAllByText('0').length).toBeGreaterThan(0)
  })

  it('shows the loading state before the first response resolves', async () => {
    vi.mocked(pharmaCampsService.myCamps).mockReturnValue(new Promise(() => {}))
    renderTab()

    expect(await screen.findByText(/loading your camps/i)).toBeInTheDocument()
  })

  it('shows the error state with Retry on failure, and Retry re-calls GET /camps/my', async () => {
    vi.mocked(pharmaCampsService.myCamps).mockRejectedValueOnce(new Error('network error'))
    renderTab()

    await screen.findByText(/failed to load your camps/i)
    expect(pharmaCampsService.myCamps).toHaveBeenCalledTimes(1)

    mockMyCamps([campFixture()], summaryFixture())
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /retry/i }))

    expect(await screen.findByText('Total camps')).toBeInTheDocument()
    expect(pharmaCampsService.myCamps).toHaveBeenCalledTimes(2)
  })
})
