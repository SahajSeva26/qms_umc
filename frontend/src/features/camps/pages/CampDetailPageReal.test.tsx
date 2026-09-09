import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
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

vi.mock('@/features/doctors/doctors.service', () => ({
  doctorsService: {
    searchDoctors: vi.fn(async () => ({ success: true, message: '', data: { items: [], count: 0 } })),
    createDoctor: vi.fn(),
    updateDoctor: vi.fn(),
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

async function mockSessionWithPermission(hasDoctorManage: boolean) {
  const { useSession } = await import('@/hooks/useSession')
  vi.mocked(useSession).mockReturnValue({
    session: { role: { id: 'r-1', code: 'admin', name: 'Admin' }, roleType: { id: 'rt-1', code: 'admin', name: 'admin' }, tenant: { id: 't-1', code: 'qms', name: 'QMS', type: 'platform' }, permissions: ['camp:create'] },
    isLoading: false, isFetching: false, isSettled: true, isError: false, error: null,
    isAuthenticated: true, isConfirmedUnauthenticated: false,
    hasPermission: (code: string) => (code === 'doctor:manage' ? hasDoctorManage : true),
    hasAnyPermission: () => true, hasAllPermissions: () => true,
    refetchSession: vi.fn(), clearSession: vi.fn(),
  } as unknown as ReturnType<typeof useSession>)
}

async function mockTenants(items: { id: string; name: string; code: string; type?: string }[]) {
  const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
  vi.mocked(accessManagementService.searchTenants).mockResolvedValue({
    success: true, message: '', data: { items, count: items.length } as never,
  })
}

async function pickCompany(user: ReturnType<typeof userEvent.setup>, name: string) {
  const companyLabel = await screen.findByText(/^Company \*/i)
  const trigger = companyLabel.parentElement!.querySelector('[role="combobox"]')!
  await user.click(trigger)
  const option = await screen.findByRole('option', { name: new RegExp(name, 'i') })
  await user.click(option)
}

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

async function renderCreatePage() {
  const CampDetailPageReal = (await import('./CampDetailPageReal')).default
  const queryClient = makeQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/camps/new']}>
        <Routes>
          <Route path="/camps/new" element={<CampDetailPageReal />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('CampDetailPageReal — create mode, inline doctor creation', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  // Locates each input via its own label text's sibling — this modal's labels
  // aren't htmlFor-associated with their inputs.
  async function fillNewDoctorRequiredFields(user: ReturnType<typeof userEvent.setup>) {
    const codeLabel = screen.getByText(/pharma doctor code/i)
    const codeInput = codeLabel.parentElement!.querySelector('input')!
    await user.type(codeInput, 'DOC-NEW')

    const nameLabel = screen.getByText(/^doctor name$/i)
    const nameInput = nameLabel.parentElement!.querySelector('input')!
    await user.type(nameInput, 'Dr. New')
  }

  it('hides the "New doctor" trigger without doctor:manage', async () => {
    await mockSessionWithPermission(false)
    await mockTenants([{ id: 't-cipla', name: 'Cipla', code: 'cipla', type: 'customer' }])
    const user = userEvent.setup()
    await renderCreatePage()

    await pickCompany(user, 'Cipla')

    expect(screen.queryByRole('button', { name: /new doctor/i })).not.toBeInTheDocument()
  })

  it('disables the "New doctor" trigger and the Doctor selector until a Company is picked', async () => {
    await mockSessionWithPermission(true)
    await renderCreatePage()

    await screen.findByText(/^Company \*/i)
    expect(screen.getByRole('button', { name: /new doctor/i })).toBeDisabled()
    expect(screen.getByText(/select company first/i)).toBeInTheDocument()
  })

  it('creating a doctor auto-selects it and leaves the rest of the draft intact', async () => {
    await mockSessionWithPermission(true)
    await mockTenants([{ id: 't-cipla', name: 'Cipla', code: 'cipla', type: 'customer' }])
    const { doctorsService } = await import('@/features/doctors/doctors.service')
    vi.mocked(doctorsService.createDoctor).mockResolvedValue({
      success: true, message: '',
      data: { id: 'doc-new', pharmaCode: 'DOC-NEW', name: 'Dr. New', specialization: 'cp', mobile: '', email: '', city: '', state: '', pincode: '', googleMapLink: '', createdAt: '', updatedAt: '', tenant: 't-cipla' },
    })

    const user = userEvent.setup()
    await renderCreatePage()
    await pickCompany(user, 'Cipla')

    // Some in-progress draft state (City) set before creating the doctor —
    // this modal's own labels aren't htmlFor-associated with their inputs.
    const cityLabel = screen.getByText(/^City$/i)
    const cityInput = cityLabel.parentElement!.querySelector('input')!
    await user.type(cityInput, 'Pune')

    await user.click(screen.getByRole('button', { name: /new doctor/i }))
    await screen.findByRole('dialog')
    // Company is locked/read-only inside the modal, not a second editable picker.
    expect(screen.getByText(/locked to the camp being booked/i)).toBeInTheDocument()

    await fillNewDoctorRequiredFields(user)
    await user.click(screen.getByRole('button', { name: /^add doctor$/i }))

    await waitFor(() => expect(doctorsService.createDoctor).toHaveBeenCalledTimes(1))
    const payload = vi.mocked(doctorsService.createDoctor).mock.calls[0][0]
    expect(payload.tenant).toBe('t-cipla')

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByText(/dr\. new/i)).toBeInTheDocument()
    expect(screen.getByDisplayValue('Pune')).toBeInTheDocument()
  })

  it('clears the selected doctor and any locally-added doctor when the Company changes', async () => {
    await mockSessionWithPermission(true)
    // Both companies mocked upfront — useTenants fetches once (no search term
    // to key a refetch off), so a mid-test mock swap wouldn't be reflected.
    await mockTenants([
      { id: 't-cipla', name: 'Cipla', code: 'cipla', type: 'customer' },
      { id: 't-sun', name: 'Sun Pharma', code: 'sunpharma', type: 'customer' },
    ])
    const { doctorsService } = await import('@/features/doctors/doctors.service')
    vi.mocked(doctorsService.createDoctor).mockResolvedValue({
      success: true, message: '',
      data: { id: 'doc-new', pharmaCode: 'DOC-NEW', name: 'Dr. New', specialization: 'cp', mobile: '', email: '', city: '', state: '', pincode: '', googleMapLink: '', createdAt: '', updatedAt: '', tenant: 't-cipla' },
    })

    const user = userEvent.setup()
    await renderCreatePage()
    await pickCompany(user, 'Cipla')

    await user.click(screen.getByRole('button', { name: /new doctor/i }))
    await fillNewDoctorRequiredFields(user)
    await user.click(screen.getByRole('button', { name: /^add doctor$/i }))

    await waitFor(() => expect(screen.getByText(/dr\. new/i)).toBeInTheDocument())

    const companyLabel = screen.getByText(/^Company \*/i)
    const trigger = companyLabel.parentElement!.querySelector('[role="combobox"]')!
    await user.click(trigger)
    const otherOption = await screen.findByRole('option', { name: /sun pharma/i })
    await user.click(otherOption)

    // Doctor selector should read "Select doctor," not the no-company placeholder.
    expect(screen.queryByText(/dr\. new/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/select company first/i)).not.toBeInTheDocument()
  })

  it('Cancel creates no doctor and leaves the camp form untouched', async () => {
    await mockSessionWithPermission(true)
    await mockTenants([{ id: 't-cipla', name: 'Cipla', code: 'cipla', type: 'customer' }])
    const { doctorsService } = await import('@/features/doctors/doctors.service')

    const user = userEvent.setup()
    await renderCreatePage()
    await pickCompany(user, 'Cipla')

    await user.click(screen.getByRole('button', { name: /new doctor/i }))
    await screen.findByRole('dialog')

    await user.click(screen.getByRole('button', { name: /^cancel$/i }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(doctorsService.createDoctor).not.toHaveBeenCalled()
  })
})

describe('CampDetailPageReal — create mode, MR/FO pickers', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  async function mockRoleTypesAndRoles(rolesByCode: Record<string, RoleEntity[]>) {
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    vi.mocked(accessManagementService.searchRoleTypes).mockImplementation(async (q) => ({
      success: true, message: '', data: { items: [{ id: `rt-${q.code}`, code: q.code }], count: 1 },
    }) as never)
    vi.mocked(accessManagementService.searchRoles).mockImplementation(async (q) => {
      const roleTypeCode = q.type === 'rt-pharma-mr' ? 'pharma-mr' : q.type === 'rt-field-officer' ? 'field-officer' : undefined
      const items = roleTypeCode ? rolesByCode[roleTypeCode] ?? [] : []
      return { success: true, message: '', data: { items, count: items.length } } as never
    })
  }

  it('changing Company clears MR, MR label, FO, and FO label together', async () => {
    await mockSessionWithPermission(true)
    await mockTenants([
      { id: 't-cipla', name: 'Cipla', code: 'cipla', type: 'customer' },
      { id: 't-sun', name: 'Sun Pharma', code: 'sunpharma', type: 'customer' },
    ])
    await mockRoleTypesAndRoles({
      'pharma-mr': [{ id: 'mr-cipla', code: 'phr-001', name: 'Cipla MR', permissions: [], status: 'active', type: 'rt-pharma-mr', user: 'u-2', tenant: 't-cipla', createdAt: '', updatedAt: '' } as RoleEntity],
      'field-officer': [{ id: 'fo-cipla', code: 'fo-001', name: 'Cipla FO', permissions: [], status: 'active', type: 'rt-field-officer', user: 'u-3', tenant: 't-cipla', createdAt: '', updatedAt: '' } as RoleEntity],
    })

    const user = userEvent.setup()
    await renderCreatePage()
    await pickCompany(user, 'Cipla')

    const mrSearchInput = await screen.findByPlaceholderText(/search mr by name/i)
    await user.type(mrSearchInput, 'Cipla')
    await user.click(await screen.findByText(/cipla mr/i, {}, { timeout: 3000 }))

    const foSearchInput = await screen.findByPlaceholderText(/search fo by name/i)
    await user.type(foSearchInput, 'Cipla')
    await user.click(await screen.findByText(/cipla fo/i, {}, { timeout: 3000 }))

    expect(screen.getByText(/cipla mr/i)).toBeInTheDocument()
    expect(screen.getByText(/cipla fo/i)).toBeInTheDocument()

    const companyLabel = screen.getByText(/^Company \*/i)
    const trigger = companyLabel.parentElement!.querySelector('[role="combobox"]')!
    await user.click(trigger)
    const otherOption = await screen.findByRole('option', { name: /sun pharma/i })
    await user.click(otherOption)

    expect(screen.queryByText(/cipla mr/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/cipla fo/i)).not.toBeInTheDocument()
    expect(await screen.findByPlaceholderText(/search mr by name/i)).toBeInTheDocument()
    expect(await screen.findByPlaceholderText(/search fo by name/i)).toBeInTheDocument()
  })

  it('the FO picker is disabled until a Company is selected', async () => {
    await mockSessionWithPermission(true)
    await renderCreatePage()

    const foLabel = await screen.findByText(/field officer \(optional/i)
    const foInput = foLabel.parentElement!.querySelector('input')!
    expect(foInput).toBeDisabled()
  })

  it('FO search sends both the selected tenant and the field-officer role type', async () => {
    await mockSessionWithPermission(true)
    await mockTenants([{ id: 't-cipla', name: 'Cipla', code: 'cipla', type: 'customer' }])
    await mockRoleTypesAndRoles({ 'field-officer': [] })
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')

    const user = userEvent.setup()
    await renderCreatePage()
    await pickCompany(user, 'Cipla')

    const foSearchInput = await screen.findByPlaceholderText(/search fo by name/i)
    await user.type(foSearchInput, 'Ramesh')

    await waitFor(() => expect(accessManagementService.searchRoles).toHaveBeenCalledWith(
      expect.objectContaining({ tenant: 't-cipla', type: 'rt-field-officer' }),
    ))
  })
})
