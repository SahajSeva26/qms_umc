import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import type { CampEntity, CampPopulatedRole } from '@/types/campReal.types'
import type { RoleEntity } from '@/types/accessManagement.types'

vi.mock('@/hooks/useSession')

vi.mock('@/components/widgets/location-picker/LocationPicker', () => ({
  default: ({ onResolutionStateChange }: {
    onResolutionStateChange?: (status: 'idle' | 'loading' | 'error') => void
  }) => (
    <>
      {/* Simulates the real widget's "pin moved, reverse-geocode still resolving"
          window — the gap between a drag/click and onChange actually firing. */}
      <button type="button" onClick={() => onResolutionStateChange?.('loading')}>
        Simulate location resolving
      </button>
      <button type="button" onClick={() => onResolutionStateChange?.('idle')}>
        Simulate location resolved
      </button>
    </>
  ),
}))

vi.mock('@/features/inventory/real/components/InventoryMasterMultiPicker', () => ({
  default: ({ onChange }: { onChange: (ids: string[], labels: Record<string, string>) => void }) => (
    <>
      <button type="button" onClick={() => onChange(['dev-new'], { 'dev-new': 'New Device (DEV-1)' })}>
        Pick a device
      </button>
      <button type="button" onClick={() => onChange([], {})}>
        Clear devices
      </button>
    </>
  ),
}))

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

vi.mock('@/features/doctors/doctors.service', () => ({
  doctorsService: {
    searchDoctors: vi.fn(async () => ({ success: true, message: '', data: { items: [], count: 0 } })),
    createDoctor: vi.fn(),
    updateDoctor: vi.fn(),
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
    timeSlot: '9am-1pm',
    location: {
      addressLine1: '221 Baker Street', city: 'Pune', state: 'Maharashtra',
      pincode: '411001', coordinates: [73.8567, 18.5204],
    },
    devices: [], status: 'requested', stageHistory: [],
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

  const CampEditPageReal = (await import('./CampEditPageReal')).default
  const queryClient = makeQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/camps/${camp.id}/edit`]}>
        <Routes>
          <Route path="/camps/:id/edit" element={<CampEditPageReal />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('CampEditPageReal — MR field', () => {
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

    expect(await screen.findByText(/original mr/i)).toBeInTheDocument()

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

    // Clicking the chip itself clears the selection, same as the explicit X button.
    await user.click(screen.getByText(/original mr/i))

    expect(screen.queryByText(/original mr/i)).not.toBeInTheDocument()
    expect(await screen.findByPlaceholderText(/search mr by name/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /save changes/i }))

    expect(await screen.findByText(/mr is required/i)).toBeInTheDocument()
    expect(campsRealService.updateCamp).not.toHaveBeenCalled()
  })
})

describe('CampEditPageReal — location resolution guard', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('disables Save (relabeled "Resolving location…") while the picked pin is still resolving, so updateCamp is never called', async () => {
    await mockSessionAndPermission()
    const { campsRealService } = await import('@/features/camps/campsReal.service')

    const user = userEvent.setup()
    await renderEditPage(campFixture())
    await screen.findByText(/edit camp/i)

    await user.click(screen.getByRole('button', { name: /simulate location resolving/i }))

    const saveButton = await screen.findByRole('button', { name: /resolving location/i })
    expect(saveButton).toBeDisabled()
    expect(campsRealService.updateCamp).not.toHaveBeenCalled()
  })
})

describe('CampEditPageReal — snapshot-vs-final dirty gating', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('saving with no edits omits type/billingType/patientExpectation/devices from the update payload', async () => {
    await mockSessionAndPermission()
    const { campsRealService } = await import('@/features/camps/campsReal.service')

    const user = userEvent.setup()
    await renderEditPage(campFixture())
    await screen.findByText(/edit camp/i)

    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => expect(campsRealService.updateCamp).toHaveBeenCalledTimes(1))
    const [, payload] = vi.mocked(campsRealService.updateCamp).mock.calls[0]
    expect(payload).not.toHaveProperty('type')
    expect(payload).not.toHaveProperty('billingType')
    expect(payload).not.toHaveProperty('patientExpectation')
    expect(payload).not.toHaveProperty('devices')
  })

  it('picking a device then clearing it back to the original empty set omits devices, but a genuine change to Type is still included', async () => {
    await mockSessionAndPermission()
    const { campsRealService } = await import('@/features/camps/campsReal.service')

    const user = userEvent.setup()
    // camp starts with devices: [] — add then remove nets back to the original set.
    await renderEditPage(campFixture({ type: 'screening' }))
    await screen.findByText(/edit camp/i)

    await user.click(screen.getByRole('button', { name: /pick a device/i }))
    await user.click(screen.getByRole('button', { name: /clear devices/i }))

    const typeLabel = screen.getByText(/^Type$/i)
    const typeTrigger = typeLabel.parentElement!.querySelector('[role="combobox"]')!
    await user.click(typeTrigger)
    await user.click(await screen.findByRole('option', { name: /^Diet$/i }))

    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => expect(campsRealService.updateCamp).toHaveBeenCalledTimes(1))
    const [, payload] = vi.mocked(campsRealService.updateCamp).mock.calls[0]
    expect(payload).not.toHaveProperty('devices')
    expect(payload).toHaveProperty('type', 'diet')
    expect(payload).not.toHaveProperty('billingType')
    expect(payload).not.toHaveProperty('patientExpectation')
  })

  it('picking a device and leaving it selected includes devices in the payload', async () => {
    await mockSessionAndPermission()
    const { campsRealService } = await import('@/features/camps/campsReal.service')

    const user = userEvent.setup()
    await renderEditPage(campFixture())
    await screen.findByText(/edit camp/i)

    await user.click(screen.getByRole('button', { name: /pick a device/i }))
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => expect(campsRealService.updateCamp).toHaveBeenCalledTimes(1))
    const [, payload] = vi.mocked(campsRealService.updateCamp).mock.calls[0]
    expect(payload).toHaveProperty('devices')
    expect(payload.devices).toEqual(['dev-new'])
    expect(payload).not.toHaveProperty('type')
    expect(payload).not.toHaveProperty('billingType')
    expect(payload).not.toHaveProperty('patientExpectation')
  })

  it('changing Type then reverting it back to the original value omits type from the payload', async () => {
    await mockSessionAndPermission()
    const { campsRealService } = await import('@/features/camps/campsReal.service')

    const user = userEvent.setup()
    await renderEditPage(campFixture({ type: 'screening' }))
    await screen.findByText(/edit camp/i)

    const typeLabel = screen.getByText(/^Type$/i)
    const typeTrigger = typeLabel.parentElement!.querySelector('[role="combobox"]')!

    await user.click(typeTrigger)
    await user.click(await screen.findByRole('option', { name: /^Diet$/i }))

    await user.click(typeTrigger)
    await user.click(await screen.findByRole('option', { name: /^Screening$/i }))

    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => expect(campsRealService.updateCamp).toHaveBeenCalledTimes(1))
    const [, payload] = vi.mocked(campsRealService.updateCamp).mock.calls[0]
    expect(payload).not.toHaveProperty('type')
    expect(payload).not.toHaveProperty('billingType')
    expect(payload).not.toHaveProperty('patientExpectation')
    expect(payload).not.toHaveProperty('devices')
  })
})
