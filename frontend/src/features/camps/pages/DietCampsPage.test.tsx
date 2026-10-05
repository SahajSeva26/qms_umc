import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { usePermission } from '@/hooks/usePermission'
import { useCampsReal } from '@/features/camps/hooks/useCampsReal'
import { useCampTypeStatusCounts } from '@/features/camps/hooks/useCampTypeStatusCounts'
import { useCampRefNames } from '@/features/camps/hooks/useCampRefNames'
import type { CampEntity } from '@/types/campReal.types'

vi.mock('@/hooks/usePermission')
vi.mock('@/features/camps/hooks/useCampsReal')
vi.mock('@/features/camps/hooks/useCampTypeStatusCounts')
vi.mock('@/features/camps/hooks/useCampRefNames')
vi.mock('@/features/camps/hooks/useCampReal')
vi.mock('@/features/camps/hooks/useMoveCampStage', () => ({
  useMoveCampStage: () => ({ mutate: vi.fn(), isPending: false, isError: false }),
}))
vi.mock('@/features/camps/hooks/useAllocateFo', () => ({
  useAllocateFo: () => ({ mutate: vi.fn(), isPending: false, isError: false }),
}))

function mockPermission(canWrite = false) {
  vi.mocked(usePermission).mockReturnValue({
    hasAnyPermission: () => canWrite,
    session: { tenant: { type: 'customer' }, role: { id: 'r-viewer' }, roleType: { code: 'admin' } },
  } as unknown as ReturnType<typeof usePermission>)
}

function dietCampFixture(overrides: Partial<CampEntity> = {}): CampEntity {
  return {
    id: 'camp-1', code: 'cmp-000001',
    tenant: { _id: 't-1', code: 'migtest', name: 'Migration Test Client' },
    division: { _id: 'div-1', code: 'div', name: 'Cardio Division' },
    project: null,
    doctor: { _id: 'doc-1', name: 'Dr. Aarav Mehta' },
    type: 'diet', billingType: 'billable', patientExpectation: 40,
    fo: null, dietitian: { _id: 'die-1', code: 'die-001', name: 'Asha Rao' },
    mr: null, asm: null, rsm: null,
    date: '2026-09-20', timeSlot: '9am-1pm',
    location: { addressLine1: '1 MG Road', city: 'Mumbai', state: 'Maharashtra', country: 'India', pincode: '400001', coordinates: [72.87, 19.07] },
    devices: [], notes: '', status: 'requested', stageHistory: [],
    createdAt: '', updatedAt: '', ...overrides,
  } as CampEntity
}

function mockCampsRealListWith(camps: CampEntity[]) {
  vi.mocked(useCampsReal).mockReturnValue({
    data: { success: true, message: '', data: { count: camps.length, items: camps } },
    isLoading: false, isError: false, error: null, refetch: vi.fn(),
  } as unknown as ReturnType<typeof useCampsReal>)
}

function mockStatusCounts(counts: Partial<Record<string, number>> = {}) {
  vi.mocked(useCampTypeStatusCounts).mockReturnValue({
    counts: {
      requested: 0, confirmed: 0, live: 0, closed: 0, cancelled: 0, cancelled_charged: 0, ...counts,
    },
    total: Object.values(counts).reduce((a, b) => (a ?? 0) + (b ?? 0), 0) ?? 0,
    isLoading: false, isError: false, refetch: vi.fn(),
  } as unknown as ReturnType<typeof useCampTypeStatusCounts>)
}

function mockRefNames() {
  vi.mocked(useCampRefNames).mockReturnValue({
    doctorName: () => 'Dr. Aarav Mehta',
    divisionName: () => 'Cardio Division',
    projectName: () => 'Diet Drive',
    roleName: () => 'Asha Rao',
    doctors: [], divisions: [], roles: [], projects: [],
  } as unknown as ReturnType<typeof useCampRefNames>)
}

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

async function renderPage() {
  const DietCampsPage = (await import('./DietCampsPage')).default
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <MemoryRouter initialEntries={['/camps/diet']}>
        <Routes>
          <Route path="/camps/diet" element={<DietCampsPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('DietCampsPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockRefNames()
  })

  it('always queries camps scoped to type=diet, never another type', async () => {
    mockPermission(false)
    mockCampsRealListWith([])
    mockStatusCounts()

    await renderPage()

    expect(useCampsReal).toHaveBeenCalledWith(expect.objectContaining({ type: 'diet' }))
  })

  it('renders real per-status KPI tiles from useCampTypeStatusCounts, not a cross-type report', async () => {
    mockPermission(false)
    mockCampsRealListWith([])
    mockStatusCounts({ requested: 4, confirmed: 2, live: 1, closed: 6, cancelled: 1, cancelled_charged: 0 })

    await renderPage()

    expect(useCampTypeStatusCounts).toHaveBeenCalledWith('diet')
    expect(screen.getByText('4')).toBeInTheDocument()
    expect(screen.getByText('6')).toBeInTheDocument()
  })

  it('renders diet camps as cards (dietitian team chip), not a table', async () => {
    mockPermission(false)
    mockCampsRealListWith([dietCampFixture()])
    mockStatusCounts({ requested: 1 })

    await renderPage()

    expect(screen.getByText('cmp-000001')).toBeInTheDocument()
    expect(screen.getByText('Migration Test Client')).toBeInTheDocument()
    expect(screen.getByText('Rao')).toBeInTheDocument()
    expect(screen.getByText(/no fo/i)).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('clicking a KPI tile updates the status filter (re-queries camps for that status)', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    mockPermission(false)
    mockCampsRealListWith([])
    mockStatusCounts({ requested: 4, confirmed: 2 })

    await renderPage()

    // "Requested" appears in both the KPI strip and the tab strip below it — the KPI tile is first.
    const [kpiTileLabel] = screen.getAllByText('Requested')
    await userEvent.setup().click(kpiTileLabel.closest('button')!)

    expect(useCampsReal).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'requested', type: 'diet' }))
  })

  it('shows "New diet camp" only when the actor can write', async () => {
    mockPermission(true)
    mockCampsRealListWith([])
    mockStatusCounts()

    await renderPage()

    expect(screen.getByRole('button', { name: /new diet camp/i })).toBeInTheDocument()
  })

  it('hides "New diet camp" when the actor lacks write permission', async () => {
    mockPermission(false)
    mockCampsRealListWith([])
    mockStatusCounts()

    await renderPage()

    expect(screen.queryByRole('button', { name: /new diet camp/i })).not.toBeInTheDocument()
  })

  it('shows the empty state when there are no diet camps', async () => {
    mockPermission(false)
    mockCampsRealListWith([])
    mockStatusCounts()

    await renderPage()

    expect(screen.getByText('No diet camps found.')).toBeInTheDocument()
  })
})
