import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PharmaDashboardTab from './PharmaDashboardTab'
import { pharmaCampsService } from '@/features/camps/camps.service'
import type { CampEntity } from '@/types/campReal.types'

vi.mock('@/features/camps/camps.service', () => ({
  pharmaCampsService: {
    searchScopedCamps: vi.fn(),
  },
}))

function campFixture(overrides: Partial<CampEntity> = {}): CampEntity {
  return {
    id: 'camp-1', code: 'C-1', project: null, doctor: { _id: 'doc-1', name: 'Dr. A' },
    type: 'screening', patientExpectation: 10, fo: null, dietitian: null, mr: null,
    date: '2026-01-01', timeSlot: null, location: null, status: 'live',
    stageHistory: [], createdAt: '2026-01-01', updatedAt: '2026-01-01',
    ...overrides,
  } as CampEntity
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

describe('PharmaDashboardTab — shared HO/RSM/ASM landing dashboard', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('calls GET /camps (not /camps/my) with the capped aggregate limit and report=true', async () => {
    mockCamps([campFixture()])

    renderTab()
    await screen.findByText('Total camps')

    expect(pharmaCampsService.searchScopedCamps).toHaveBeenCalledWith({ limit: '200', report: 'true' })
  })

  it('shows plain "Total camps" with no disclaimer when the full result set fits inside one page', async () => {
    mockCamps([campFixture(), campFixture({ id: 'camp-2' })], 2)

    renderTab()

    expect(await screen.findByText('Total camps')).toBeInTheDocument()
    expect(screen.queryByText(/the breakdowns below reflect this sample/i)).not.toBeInTheDocument()
  })

  it('shows the sample-size disclaimer and relabels every tile once the real total exceeds the capped page', async () => {
    mockCamps([campFixture()], 450)

    renderTab()

    expect(await screen.findByText(/showing your latest 1 of 450 camps/i)).toBeInTheDocument()
    expect(screen.getByText('Camps (latest)')).toBeInTheDocument()
    expect(screen.getByText('Live (latest)')).toBeInTheDocument()
    expect(screen.getByText('Closed (latest)')).toBeInTheDocument()
    expect(screen.getByText('Doctors (latest)')).toBeInTheDocument()
    expect(screen.getByText('Patients (latest)')).toBeInTheDocument()
    expect(screen.queryByText('Total camps')).not.toBeInTheDocument()
    expect(screen.queryByText('Unique doctors')).not.toBeInTheDocument()
    expect(screen.queryByText('Total patients')).not.toBeInTheDocument()
  })

  it('computes unique-doctor and total-patient tiles only over the returned sample, not the true total', async () => {
    mockCamps([
      campFixture({ id: 'c1', doctor: { _id: 'doc-1', name: 'Dr. A' }, stats: { patients: 5, patientsCompleted: 5 } }),
      campFixture({ id: 'c2', doctor: { _id: 'doc-1', name: 'Dr. A' }, stats: { patients: 3, patientsCompleted: 3 } }),
      campFixture({ id: 'c3', doctor: { _id: 'doc-2', name: 'Dr. B' }, stats: { patients: 2, patientsCompleted: 2 } }),
    ], 3)

    renderTab()

    expect(await screen.findByText('Unique doctors')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument() // 2 unique doctors
    expect(screen.getByText('10')).toBeInTheDocument() // 5+3+2 total patients
  })

  it('shows an empty state for both breakdown cards when there are no camps', async () => {
    mockCamps([], 0)

    renderTab()

    expect(await screen.findAllByText('No camps yet.')).toHaveLength(2)
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
