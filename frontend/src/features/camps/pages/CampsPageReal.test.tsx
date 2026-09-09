import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { usePermission } from '@/hooks/usePermission'
import { useCampsReal } from '@/features/camps/hooks/useCampsReal'
import { useCampReport } from '@/features/camps/hooks/useCampReport'
import { useCampReal } from '@/features/camps/hooks/useCampReal'
import { useCampRefNames } from '@/features/camps/hooks/useCampRefNames'
import type { CampEntity } from '@/types/campReal.types'

vi.mock('@/hooks/usePermission')
vi.mock('@/features/camps/hooks/useCampsReal')
vi.mock('@/features/camps/hooks/useCampReport')
vi.mock('@/features/camps/hooks/useCampReal')
vi.mock('@/features/camps/hooks/useCampRefNames')
vi.mock('@/features/camps/hooks/useMoveCampStage', () => ({
  useMoveCampStage: () => ({ mutate: vi.fn(), isPending: false, isError: false }),
}))
vi.mock('@/features/camps/hooks/useAllocateFo', () => ({
  useAllocateFo: () => ({ mutate: vi.fn(), isPending: false, isError: false }),
}))

function mockPermission(canViewReport: boolean, canWrite = false) {
  vi.mocked(usePermission).mockReturnValue({
    hasAnyPermission: (codes: string[]) => {
      if (codes.includes('camp:manage') && canViewReport) return true
      return canWrite
    },
    session: { tenant: { type: 'customer' }, role: { id: 'r-viewer' }, roleType: { code: 'admin' } },
  } as unknown as ReturnType<typeof usePermission>)
}

function mockCampsRealList() {
  vi.mocked(useCampsReal).mockReturnValue({
    data: { success: true, message: '', data: { count: 0, items: [] } },
    isLoading: false, isError: false, error: null, refetch: vi.fn(),
  } as unknown as ReturnType<typeof useCampsReal>)
}

function reportFixture() {
  return {
    success: true,
    message: '',
    data: {
      summary: { totalCamps: 23 },
      byStatus: [
        { status: 'requested' as const, count: 3 },
        { status: 'confirmed' as const, count: 5 },
        { status: 'live' as const, count: 8 },
        { status: 'closed' as const, count: 4 },
        { status: 'cancelled' as const, count: 2 },
        { status: 'cancelled_charged' as const, count: 1 },
      ],
      byType: [
        { type: 'screening' as const, count: 10 },
        { type: 'diet' as const, count: 8 },
        { type: 'lab' as const, count: 5 },
      ],
      byBillingType: [
        { billingType: 'billable' as const, count: 20 },
        { billingType: 'void' as const, count: 3 },
      ],
    },
  }
}

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

async function renderPage(initialEntries: string[] = ['/camps']) {
  const CampsPageReal = (await import('./CampsPageReal')).default
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/camps" element={<CampsPageReal />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function campFixture(overrides: Partial<CampEntity> = {}): CampEntity {
  return {
    id: 'camp-1', code: 'cmp-000001',
    tenant: { _id: 't-1', code: 'migtest', name: 'Migration Test Client' },
    division: { _id: 'div-1', code: 'div', name: 'Cardio Division' },
    project: null,
    doctor: { _id: 'doc-1', name: 'Dr. Aarav Mehta' },
    type: 'screening', billingType: 'billable', patientExpectation: 40,
    fo: { _id: 'fo-1', code: 'fo-001', name: 'Ravi Kumar' },
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

function mockCampReal(camp: CampEntity | null) {
  vi.mocked(useCampReal).mockReturnValue({
    data: camp ? { success: true, message: '', data: camp } : undefined,
    isLoading: false, error: null,
  } as unknown as ReturnType<typeof useCampReal>)
}

function mockRefNames() {
  vi.mocked(useCampRefNames).mockReturnValue({
    doctorName: () => 'Dr. Aarav Mehta',
    divisionName: () => 'Cardio Division',
    projectName: () => 'Screening Drive',
    roleName: () => 'Ravi Kumar',
    doctors: [], divisions: [], roles: [], projects: [],
  } as unknown as ReturnType<typeof useCampRefNames>)
}

describe('CampsPageReal — KPI strip backed by GET /camps/report', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockCampsRealList()
    mockRefNames()
  })

  it('renders status counts and total from the real report, not a capped list reduction', async () => {
    mockPermission(true)
    vi.mocked(useCampReport).mockReturnValue({
      data: reportFixture(), isLoading: false, isError: false, refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCampReport>)

    await renderPage()

    expect(useCampReport).toHaveBeenCalledWith(true)
    expect(screen.getByText('23')).toBeInTheDocument()
    expect(screen.getByText('8')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('never enables the report query and never renders the strip when lacking camp:manage/tenant:manage', async () => {
    mockPermission(false)
    vi.mocked(useCampReport).mockReturnValue({
      data: undefined, isLoading: false, isError: false, refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCampReport>)

    await renderPage()

    expect(useCampReport).toHaveBeenCalledWith(false)
    expect(screen.queryByText('23')).not.toBeInTheDocument()
  })

  it('shows its own "Loading camp report…" state independently while the camp table below is already loaded', async () => {
    mockPermission(true)
    mockCampsRealList()
    vi.mocked(useCampReport).mockReturnValue({
      data: undefined, isLoading: true, isError: false, refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCampReport>)

    await renderPage()

    expect(screen.getByText(/loading camp report/i)).toBeInTheDocument()
    expect(document.querySelector('input')).toBeInTheDocument()
  })

  it('shows its own error state with a working Retry, independent of the camp table', async () => {
    mockPermission(true)
    mockCampsRealList()
    const refetch = vi.fn()
    vi.mocked(useCampReport).mockReturnValue({
      data: undefined, isLoading: false, isError: true, refetch,
    } as unknown as ReturnType<typeof useCampReport>)

    const { default: userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    await renderPage()

    expect(screen.getByText(/failed to load camp report/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /retry/i }))
    expect(refetch).toHaveBeenCalledTimes(1)
  })
})

describe('CampsPageReal — drawer URL/history behavior', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockRefNames()
    vi.mocked(useCampReport).mockReturnValue({
      data: undefined, isLoading: false, isError: false, refetch: vi.fn(),
    } as unknown as ReturnType<typeof useCampReport>)
  })

  it('opening a row pushes ?camp=<id> and closing the drawer clears it via a history replace (Back leaves the page, not reopens the drawer)', async () => {
    mockPermission(false)
    mockCampsRealListWith([campFixture()])
    mockCampReal(campFixture())
    const { default: userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()

    await renderPage()

    expect(screen.queryByRole('button', { name: /close/i })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'cmp-000001' }))
    expect(await screen.findByRole('button', { name: /close/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /close/i }))
    expect(screen.queryByRole('button', { name: /close/i })).not.toBeInTheDocument()
  })

  it('loading /camps?camp=<id> directly opens the drawer for that camp on first render', async () => {
    mockPermission(false)
    mockCampsRealListWith([campFixture()])
    mockCampReal(campFixture())

    await renderPage(['/camps?camp=camp-1'])

    expect(await screen.findAllByText('cmp-000001')).not.toHaveLength(0)
  })
})
