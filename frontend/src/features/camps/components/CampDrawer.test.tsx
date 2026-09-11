import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { usePermission } from '@/hooks/usePermission'
import { useCampReal } from '@/features/camps/hooks/useCampReal'
import { useCampRefNames } from '@/features/camps/hooks/useCampRefNames'
import CampDrawer from './CampDrawer'
import type { CampEntity } from '@/types/campReal.types'

vi.mock('@/hooks/usePermission')
vi.mock('@/features/camps/hooks/useCampReal')
vi.mock('@/features/camps/hooks/useCampRefNames')
vi.mock('@/features/camps/hooks/useMoveCampStage', () => ({
  useMoveCampStage: () => ({ mutate: vi.fn(), isPending: false, isError: false }),
}))
vi.mock('@/features/camps/hooks/useAllocateFo', () => ({
  useAllocateFo: () => ({ mutate: vi.fn(), isPending: false, isError: false }),
}))

const navigateMock = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => navigateMock }
})

function mockPermission(overrides: Partial<{ canUpdate: boolean; canMoveStage: boolean; canManageScreening: boolean }> = {}) {
  const { canUpdate = true, canMoveStage = true, canManageScreening = true } = overrides
  vi.mocked(usePermission).mockReturnValue({
    hasAnyPermission: (codes: string[]) => {
      if (codes.includes('screening:manage')) return canManageScreening
      if (codes.includes('camp:update')) return canUpdate
      if (codes.includes('camp:manage')) return canMoveStage
      return false
    },
    session: { role: { id: 'r-viewer' }, roleType: { code: 'admin' } },
  } as unknown as ReturnType<typeof usePermission>)
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
    devices: [], notes: 'Bring extra kits', status: 'requested', stageHistory: [],
    createdAt: '', updatedAt: '', ...overrides,
  } as CampEntity
}

function mockCamp(camp: CampEntity | null, isLoading = false) {
  vi.mocked(useCampReal).mockReturnValue({
    data: camp ? { success: true, message: '', data: camp } : undefined,
    isLoading, error: null,
  } as unknown as ReturnType<typeof useCampReal>)
}

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

function renderDrawer(campId: string | null, onClose = vi.fn()) {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <MemoryRouter>
        <CampDrawer campId={campId} onClose={onClose} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('CampDrawer', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockRefNames()
  })

  it('renders nothing open when campId is null', () => {
    mockPermission()
    mockCamp(null)
    renderDrawer(null)

    expect(screen.queryByText('cmp-000001')).not.toBeInTheDocument()
  })

  it('shows the Overview tab by default with code, status, and the important actions above the read-only fields', () => {
    mockPermission()
    mockCamp(campFixture())
    renderDrawer('camp-1')

    expect(screen.getAllByText('cmp-000001').length).toBeGreaterThan(0)
    expect(screen.getByText('Requested')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /move stage/i })).toBeInTheDocument()
    // Company/Division/etc. read-only rows are present in Overview.
    expect(screen.getByText('Migration Test Client')).toBeInTheDocument()
    expect(screen.getByText('Cardio Division')).toBeInTheDocument()
    expect(screen.getByText('Ravi Kumar')).toBeInTheDocument()
  })

  it('shows Run screening only for a live camp the viewer is eligible to screen', () => {
    mockPermission({ canManageScreening: true })
    mockCamp(campFixture({ status: 'live' }))
    renderDrawer('camp-1')

    expect(screen.getByRole('button', { name: /run screening/i })).toBeInTheDocument()
  })

  it('does not show Run screening for a non-live camp', () => {
    mockPermission({ canManageScreening: true })
    mockCamp(campFixture({ status: 'requested' }))
    renderDrawer('camp-1')

    expect(screen.queryByRole('button', { name: /run screening/i })).not.toBeInTheDocument()
  })

  it('Edit navigates to the dedicated edit page, not an inline form or modal', async () => {
    mockPermission({ canUpdate: true })
    mockCamp(campFixture())
    const user = userEvent.setup()
    renderDrawer('camp-1')

    await user.click(screen.getByRole('button', { name: /edit camp/i }))

    expect(navigateMock).toHaveBeenCalledWith('/camps/camp-1/edit', { state: { fromDrawer: true } })
    // No inline field editing anywhere in the drawer.
    expect(screen.queryByRole('textbox', { name: /notes/i })).not.toBeInTheDocument()
  })

  it('hides the Edit control without camp:update/camp:manage/tenant:manage', () => {
    mockPermission({ canUpdate: false })
    mockCamp(campFixture())
    renderDrawer('camp-1')

    expect(screen.queryByRole('button', { name: /edit camp/i })).not.toBeInTheDocument()
  })

  it('switches to the Stage history tab and shows the camp\'s history', async () => {
    mockPermission()
    mockCamp(campFixture({
      stageHistory: [{ from: 'requested', to: 'confirmed', reason: 'Doctor confirmed', actor: { name: 'Ops Admin' }, createdAt: '2026-09-01T00:00:00.000Z' }],
    }))
    const user = userEvent.setup()
    renderDrawer('camp-1')

    await user.click(screen.getByRole('button', { name: 'Stage history' }))

    expect(screen.getByText(/doctor confirmed/i)).toBeInTheDocument()
  })

  it('shows a loading state while the camp is being fetched', () => {
    mockPermission()
    mockCamp(null, true)
    renderDrawer('camp-1')

    expect(screen.getByText(/loading camp/i)).toBeInTheDocument()
  })
})
