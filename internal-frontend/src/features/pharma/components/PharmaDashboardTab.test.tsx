import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PharmaDashboardTab from './PharmaDashboardTab'
import { pharmaCampsService } from '@/features/pharma/pharmaCamps.service'
import type { CampEntity } from '@/types/campReal.types'

vi.mock('@/features/pharma/pharmaCamps.service', () => ({
  pharmaCampsService: {
    searchScopedCamps: vi.fn(),
  },
}))

function campFixture(overrides: Partial<CampEntity> = {}): CampEntity {
  return {
    id: 'camp-1', code: 'cmp-000001', tenant: 't-1', division: 'div-1', project: 'proj-1',
    doctor: { _id: 'doc-1', name: 'Dr. One' }, type: 'screening', billingType: 'billable', patientExpectation: 0,
    fo: null, mr: null, date: '2026-09-15',
    timeSlot: '9am-1pm',
    location: {
      addressLine1: '221 Baker Street', city: 'Pune', state: 'Maharashtra',
      pincode: '411001', coordinates: [73.8567, 18.5204],
    },
    devices: [], status: 'requested', stageHistory: [],
    createdAt: '', updatedAt: '', ...overrides,
  } as unknown as CampEntity
}

function mockCamps(items: CampEntity[], count = items.length) {
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
      <PharmaDashboardTab />
    </QueryClientProvider>,
  )
}

// This is the GENERIC dashboard (HO/RSM/ASM — all 4 pharma roles can call GET /camps via
// camp:book), distinct from MrDashboardTab (MR-only, GET /camps/my). See the bug this test suite
// guards against: GET /camps/my's RoleGuard 403s HO/RSM/ASM, so this component must never call it.
describe('PharmaDashboardTab (generic pharma dashboard — HO/RSM/ASM)', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('calls GET /camps (searchScopedCamps), not GET /camps/my — HO/RSM/ASM would 403 on /camps/my', async () => {
    mockCamps([campFixture()])

    renderTab()
    await screen.findByText('Total camps')

    expect(pharmaCampsService.searchScopedCamps).toHaveBeenCalledWith({ limit: '200', report: 'true' })
  })

  it('shows real tile values computed from the fetched camps page', async () => {
    mockCamps([
      campFixture({ id: 'c1', status: 'live', type: 'screening', doctor: { _id: 'd1', name: 'Dr A' } as never }),
      campFixture({ id: 'c2', status: 'closed', type: 'diet', doctor: { _id: 'd2', name: 'Dr B' } as never, stats: { patients: 5, patientsCompleted: 5 } }),
    ])

    renderTab()

    expect(await screen.findByText('Total camps')).toBeInTheDocument()
    expect(screen.getAllByText('2').length).toBeGreaterThan(0) // total camps count and/or unique doctors
    expect(screen.getByText('Unique doctors')).toBeInTheDocument()
    expect(screen.getByText('Total patients')).toBeInTheDocument()
  })

  it('shows a sampling disclaimer and relabels the tile when the page is truncated (count > items.length)', async () => {
    mockCamps([campFixture()], 500)

    renderTab()

    expect(await screen.findByText(/reflect this sample, not your full history/i)).toBeInTheDocument()
    expect(screen.getByText('Camps (latest)')).toBeInTheDocument()
  })

  it('never shows a disclaimer when the full set fits on one page', async () => {
    mockCamps([campFixture()])

    renderTab()
    await screen.findByText('Total camps')

    expect(screen.queryByText(/reflect this sample/i)).not.toBeInTheDocument()
  })

  it('shows the loading state before the first response resolves', async () => {
    vi.mocked(pharmaCampsService.searchScopedCamps).mockReturnValue(new Promise(() => {}))
    renderTab()

    expect(await screen.findByText(/loading your camps/i)).toBeInTheDocument()
  })

  it('shows the error state with Retry on failure, and Retry re-calls the search', async () => {
    vi.mocked(pharmaCampsService.searchScopedCamps).mockRejectedValueOnce(new Error('network error'))
    renderTab()

    await screen.findByText(/failed to load your camps/i)
    expect(pharmaCampsService.searchScopedCamps).toHaveBeenCalledTimes(1)

    mockCamps([campFixture()])
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /retry/i }))

    expect(await screen.findByText('Total camps')).toBeInTheDocument()
    expect(pharmaCampsService.searchScopedCamps).toHaveBeenCalledTimes(2)
  })
})
