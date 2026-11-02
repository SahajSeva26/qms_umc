import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PharmaDashboardTab from './PharmaDashboardTab'
import { pharmaCampsService } from '@/features/camps/camps.service'
import type { CampSummary } from '@/types/campReal.types'

vi.mock('@/features/camps/camps.service', () => ({
  pharmaCampsService: {
    myCamps: vi.fn(),
  },
}))

function summaryFixture(overrides: Partial<CampSummary> = {}): CampSummary {
  return {
    totalCamps: 0,
    statusCounts: [],
    typeCounts: [],
    ...overrides,
  }
}

function mockMyCamps(summary: CampSummary, items: unknown[] = []) {
  vi.mocked(pharmaCampsService.myCamps).mockResolvedValue({
    success: true, message: '', data: { items, count: items.length, summary },
  } as never)
}

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

function renderTab() {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <PharmaDashboardTab />
    </QueryClientProvider>,
  )
}

describe('PharmaDashboardTab — shared HO/RSM/ASM landing dashboard', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('calls GET /camps/my (the server-computed, own-scoped summary), not the capped generic search', async () => {
    mockMyCamps(summaryFixture({ totalCamps: 1 }))

    renderTab()
    await screen.findByText('Total camps')

    expect(pharmaCampsService.myCamps).toHaveBeenCalledWith({ page: '1', limit: '10' })
  })

  it('renders the real totals from the server-computed summary', async () => {
    mockMyCamps(summaryFixture({
      totalCamps: 7,
      statusCounts: [{ status: 'live', count: 3 }, { status: 'closed', count: 4 }],
    }))

    renderTab()

    const totalTile = (await screen.findByText('Total camps')).closest<HTMLElement>('.rounded-xl')!
    expect(within(totalTile).getByText('7')).toBeInTheDocument()

    const byStatusCard = screen.getByText('By status').closest('div')!.parentElement!
    expect(within(byStatusCard).getByText('3')).toBeInTheDocument() // live
    expect(within(byStatusCard).getByText('4')).toBeInTheDocument() // closed
  })

  it('renders per-status and per-type breakdown rows from the summary', async () => {
    mockMyCamps(summaryFixture({
      totalCamps: 2,
      statusCounts: [{ status: 'live', count: 1 }, { status: 'closed', count: 1 }],
      typeCounts: [{ type: 'screening', count: 2 }],
    }))

    renderTab()

    expect(await screen.findByText('Screening')).toBeInTheDocument()
    expect(screen.getByText('By status')).toBeInTheDocument()
    expect(screen.getByText('By camp type')).toBeInTheDocument()
  })

  it('shows an empty state for both breakdown cards when there are no camps', async () => {
    mockMyCamps(summaryFixture({ totalCamps: 0 }))

    renderTab()

    expect(await screen.findAllByText('No camps yet.')).toHaveLength(2)
  })

  it('shows the error state with Retry on failure, and Retry re-calls myCamps', async () => {
    vi.mocked(pharmaCampsService.myCamps).mockRejectedValueOnce(new Error('network error'))
    renderTab()

    await screen.findByText(/failed to load your camps/i)
    expect(pharmaCampsService.myCamps).toHaveBeenCalledTimes(1)

    mockMyCamps(summaryFixture({ totalCamps: 1 }))
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /retry/i }))

    expect(await screen.findByText('Total camps')).toBeInTheDocument()
    expect(pharmaCampsService.myCamps).toHaveBeenCalledTimes(2)
  })
})
