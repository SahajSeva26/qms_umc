import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import type { CampEntity, CampPopulatedRole } from '@/types/campReal.types'
import type { RoleEntity } from '@/types/accessManagement.types'

vi.mock('@/hooks/useSession')

vi.mock('@/features/camps/campsReal.service', () => ({
  campsRealService: {
    getCamp: vi.fn(),
    searchCamps: vi.fn(async () => ({ success: true, message: '', data: { items: [], count: 0 } })),
    createCamp: vi.fn(),
    updateCamp: vi.fn(async () => ({ success: true, message: '', data: {} })),
    bookCamp: vi.fn(),
    moveCampStage: vi.fn(),
    allocateFo: vi.fn(),
  },
}))

vi.mock('@/features/doctors/doctors.service', () => ({
  doctorsService: {
    searchDoctors: vi.fn(async () => ({ success: true, message: '', data: { items: [], count: 0 } })),
  },
}))

vi.mock('@/features/crm/divisions/division.service', () => ({
  divisionService: {
    searchDivisions: vi.fn(async () => ({ success: true, message: '', data: { items: [], count: 0 } })),
    getDivision: vi.fn(),
  },
}))

vi.mock('@/features/access-management/accessManagement.service', () => ({
  accessManagementService: {
    searchTenants: vi.fn(async () => ({ success: true, message: '', data: { items: [], count: 0 } })),
    searchRoleTypes: vi.fn(async () => ({ success: true, message: '', data: { items: [{ id: 'rt-fo', code: 'field-officer' }], count: 1 } })),
    searchRoles: vi.fn(async () => ({ success: true, message: '', data: { items: [], count: 0 } })),
  },
}))

vi.mock('@/features/projects/projects.service', () => ({
  projectsService: {
    getProject: vi.fn(),
    searchProjects: vi.fn(async () => ({ success: true, message: '', data: { items: [], count: 0 } })),
  },
}))

vi.mock('@/features/inventory/real/inventoryMaster.service', () => ({
  inventoryMasterService: {
    searchInventoryMasters: vi.fn(async () => ({ success: true, message: '', data: { items: [], count: 0 } })),
  },
}))

function campFixture(overrides: Partial<CampEntity> = {}): CampEntity {
  const mrFixture: CampPopulatedRole = { _id: 'mr-original', code: 'phr-000001', name: 'Original MR', status: 'active' }
  return {
    id: 'camp-1', code: 'cmp-000001', tenant: 't-1', division: 'div-1', project: null,
    doctor: 'doc-1', type: 'screening', billingType: 'billable', patientExpectation: 0,
    fo: null, mr: mrFixture, date: '2026-09-15',
    timeSlot: '9am-1pm', city: 'Pune', state: 'Maharashtra',
    coordinates: [73.8567, 18.5204], devices: [], status: 'requested', stageHistory: [],
    createdAt: '', updatedAt: '', ...overrides,
  } as CampEntity
}

function mrRoleFixture(overrides: Partial<RoleEntity> = {}): RoleEntity {
  return { id: 'mr-new', code: 'phr-000002', name: 'Replacement MR', permissions: [], status: 'active', type: 'rt-mr', user: 'u-2', tenant: 't-1', createdAt: '', updatedAt: '', ...overrides } as RoleEntity
}

async function mockSessionAndPermission() {
  const { useSession } = await import('@/hooks/useSession')
  vi.mocked(useSession).mockReturnValue({
    session: { role: { id: 'r-1', code: 'admin', name: 'Admin' }, roleType: { id: 'rt-1', code: 'admin', name: 'admin' }, tenant: { id: 't-1', code: 'qms', name: 'QMS', type: 'platform' }, permissions: ['camp:manage', 'camp:create', 'camp:update'] },
    isLoading: false, isFetching: false, isSettled: true, isError: false, error: null,
    isAuthenticated: true, isConfirmedUnauthenticated: false,
    hasPermission: () => true, hasAnyPermission: () => true, hasAllPermissions: () => true,
    refetchSession: vi.fn(), clearSession: vi.fn(),
  } as unknown as ReturnType<typeof useSession>)
}

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

async function renderEditPage(camp: CampEntity) {
  const { campsRealService } = await import('@/features/camps/campsReal.service')
  vi.mocked(campsRealService.getCamp).mockResolvedValue({ success: true, message: '', data: camp })

  const CampDetailPageReal = (await import('./CampDetailPageReal')).default
  const queryClient = makeQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/camps/${camp.id}`]}>
        <Routes>
          <Route path="/camps/:id" element={<CampDetailPageReal />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('CampDetailPageReal — edit mode MR field', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('replacing the MR sends the new MR id in the update payload', async () => {
    await mockSessionAndPermission()
    const { campsRealService } = await import('@/features/camps/campsReal.service')
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')

    vi.mocked(accessManagementService.searchRoleTypes).mockResolvedValue({
      success: true, message: '', data: { items: [{ id: 'rt-fo', code: 'field-officer' }], count: 1 } as never,
    })
    vi.mocked(accessManagementService.searchRoles).mockResolvedValue({
      success: true, message: '', data: { items: [mrRoleFixture()], count: 1 } as never,
    })

    const user = userEvent.setup()
    await renderEditPage(campFixture())

    await screen.findByText(/edit camp/i)

    // Existing MR shows as the current selection.
    expect(await screen.findByText(/original mr/i)).toBeInTheDocument()

    // Click the chip to reopen the picker and search for a replacement.
    await user.click(screen.getByText(/original mr/i))
    const mrSearchInput = await screen.findByPlaceholderText(/search mr by name/i)
    await user.type(mrSearchInput, 'Replacement')
    const option = await screen.findByText(/replacement mr/i, {}, { timeout: 3000 })
    await user.click(option)

    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => expect(campsRealService.updateCamp).toHaveBeenCalledTimes(1))
    const [, payload] = vi.mocked(campsRealService.updateCamp).mock.calls[0]
    expect(payload.mr).toBe('mr-new')
  })

  it('clearing the MR then saving shows validation and sends no update request', async () => {
    await mockSessionAndPermission()
    const { campsRealService } = await import('@/features/camps/campsReal.service')

    const user = userEvent.setup()
    await renderEditPage(campFixture())

    await screen.findByText(/edit camp/i)
    expect(await screen.findByText(/original mr/i)).toBeInTheDocument()

    // Clicking the chip itself clears the selection and reopens the search
    // input (AsyncPicker's own chip-click behavior — same as the explicit X
    // button, both call the same clearSelection()).
    await user.click(screen.getByText(/original mr/i))

    expect(screen.queryByText(/original mr/i)).not.toBeInTheDocument()
    expect(await screen.findByPlaceholderText(/search mr by name/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /save changes/i }))

    expect(await screen.findByText(/mr is required/i)).toBeInTheDocument()
    expect(campsRealService.updateCamp).not.toHaveBeenCalled()
  })
})
