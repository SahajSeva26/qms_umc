import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { format } from 'date-fns'
import { useAuthStore } from '@/features/auth/store'
import type { RoleEntity } from '@/types/accessManagement.types'

vi.mock('@/hooks/useSession')

vi.mock('@/components/widgets/location-picker/LocationPicker', () => ({
  default: ({ value, onChange, onResolutionStateChange }: {
    value: unknown
    onChange: (v: unknown) => void
    onResolutionStateChange?: (status: 'idle' | 'loading' | 'error') => void
  }) => (
    <>
      {/* Shared mock (module-path, not caller-scoped): supplies coordinates for CampFoPicker
          and the fuller address EditDoctorModal's own completeness check needs. */}
      <button
        type="button"
        onClick={() => onChange({
          addressLine1: '12 Test Road', addressLine2: undefined, locality: undefined,
          city: 'Test City', state: 'Test State', country: undefined, pincode: '110001', googlePlaceId: undefined,
          ...(value as object ?? {}),
          coordinates: [77.02, 28.52],
        })}
      >
        Set test coordinates
      </button>
      {/* Simulates the gap between a drag/click and onChange firing (reverse-geocode resolving). */}
      <button type="button" onClick={() => onResolutionStateChange?.('loading')}>
        Simulate location resolving
      </button>
      <button type="button" onClick={() => onResolutionStateChange?.('idle')}>
        Simulate location resolved
      </button>
    </>
  ),
}))
vi.mock('@/components/widgets/location-picker/LocationAddressFields', () => ({ default: () => null }))

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
    searchDivisions: vi.fn(async () => ({ success: true, message: '', data: { items: [{ id: 'div-1', name: 'Cardiology', code: 'cardio', tenant: 't-cipla', therapy: [], mrCount: 0, createdAt: '', updatedAt: '' }], count: 1 } })),
    getDivision: vi.fn(),
  },
}))

vi.mock('@/features/access-management/accessManagement.service', () => ({
  accessManagementService: {
    searchTenants: vi.fn(async () => ({ success: true, message: '', data: { items: [], count: 0 } })),
    searchRoleTypes: vi.fn(async () => ({ success: true, message: '', data: { items: [{ id: 'rt-fo', code: 'field-officer' }], count: 1 } })),
    searchRoles: vi.fn(async () => ({ success: true, message: '', data: { items: [], count: 0 } })),
    getRole: vi.fn(),
  },
}))

vi.mock('@/features/geo-profile/geoProfile.service', () => ({
  geoProfileService: {
    nearestGeoProfiles: vi.fn(async () => ({ success: true, message: '', data: { items: [], count: 0 } })),
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

// Default divisionService mock resolves one division ("Cardiology"), which this helper picks.
async function pickDivision(user: ReturnType<typeof userEvent.setup>, name = 'Cardiology') {
  const divisionLabel = await screen.findByText(/^Division \*/i)
  const trigger = divisionLabel.parentElement!.querySelector('[role="combobox"]')!
  await user.click(trigger)
  const option = await screen.findByRole('option', { name: new RegExp(name, 'i') })
  await user.click(option)
}

async function mockProjectWithDivision() {
  const { projectsService } = await import('@/features/projects/projects.service')
  vi.mocked(projectsService.searchProjects).mockResolvedValue({
    success: true,
    message: '',
    data: { items: [{ id: 'proj-1', code: 'prj-001', name: 'Cipla Project', status: 'new', division: 'div-1', campTimeSlots: ['9am-1pm'], tests: [] }], count: 1 },
  } as never)
}

async function pickProject(user: ReturnType<typeof userEvent.setup>) {
  const projectInput = await screen.findByPlaceholderText(/search or browse projects/i)
  await user.type(projectInput, 'Cipla')
  await user.click(await screen.findByText(/cipla project/i, {}, { timeout: 3000 }))
}

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

// Date is the shared shadcn DatePicker now — drive it via trigger -> dropdown -> day-cell.
async function pickCampDate(user: ReturnType<typeof userEvent.setup>, isoDate: string) {
  const dateLabel = screen.getByText(/^date$/i)
  const trigger = dateLabel.parentElement!.querySelector('button')!
  await user.click(trigger)

  const [year, month] = isoDate.split('-').map(Number)
  await user.selectOptions(screen.getByRole('combobox', { name: /choose the month/i }), String(month - 1))
  await user.selectOptions(screen.getByRole('combobox', { name: /choose the year/i }), String(year))

  // react-day-picker's default day aria-label is date-fns's "PPPP" format.
  const dayLabel = format(new Date(`${isoDate}T00:00:00`), 'PPPP')
  await user.click(screen.getByRole('button', { name: new RegExp(`^${dayLabel}`, 'i') }))
}

// useCampDraftStore keys off the real useAuthStore — a fresh id per render keeps drafts isolated.
let draftTestUserCounter = 0
function nextDraftTestUserId() {
  draftTestUserCounter += 1
  return `camp-draft-test-user-${draftTestUserCounter}`
}

async function renderCreatePage(initialPath = '/camps/new') {
  useAuthStore.getState().setAuth({ id: nextDraftTestUserId(), email: 'system@gmail.com', firstName: 'System', lastName: 'User' })
  const CampDetailPageReal = (await import('./CampDetailPageReal')).default
  const queryClient = makeQueryClient()
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/camps/new" element={<CampDetailPageReal />} />
          <Route path="/camps" element={<div>Camp Management page</div>} />
          <Route path="/camps/screening" element={<div>Screening Camps page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  // Every render starts on a fresh user with no saved draft — waits past the brief
  // "Checking for a saved draft…" loading placeholder into the real form content.
  await screen.findByText(/^Company \*/i)
  return utils
}

describe('CampDetailPageReal — create mode, inline doctor creation', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    sessionStorage.clear()
    useAuthStore.getState().clearAuth()
  })

  // This modal's labels aren't htmlFor-associated with their inputs, hence the sibling lookup.
  async function fillNewDoctorRequiredFields(user: ReturnType<typeof userEvent.setup>) {
    const codeLabel = screen.getByText(/pharma doctor code/i)
    const codeInput = codeLabel.parentElement!.querySelector('input')!
    await user.type(codeInput, 'DOC-NEW')

    const nameLabel = screen.getByText(/^doctor name$/i)
    const nameInput = nameLabel.parentElement!.querySelector('input')!
    await user.type(nameInput, 'Dr. New')

    // Required on create per CreateDoctorPayloadSchema (no .optional(), min 10).
    const mobileLabel = screen.getByText(/^mobile$/i)
    const mobileInput = mobileLabel.parentElement!.querySelector('input')!
    await user.type(mobileInput, '9876543210')

    // Required on create per CreateDoctorPayloadSchema (no .optional()).
    const emailLabel = screen.getByText(/^email$/i)
    const emailInput = emailLabel.parentElement!.querySelector('input')!
    await user.type(emailInput, 'newdoc@example.com')

    await user.click(screen.getByRole('button', { name: /set test coordinates/i }))
  }

  it('hides the "New doctor" trigger without doctor:manage', async () => {
    await mockSessionWithPermission(false)
    await mockTenants([{ id: 't-cipla', name: 'Cipla', code: 'cipla', type: 'customer' }])
    const user = userEvent.setup()
    await renderCreatePage()

    await pickCompany(user, 'Cipla')

    expect(screen.queryByRole('button', { name: /new doctor/i })).not.toBeInTheDocument()
  })

  it('disables the "New doctor" trigger and the Doctor selector until a Division is picked', async () => {
    await mockSessionWithPermission(true)
    await renderCreatePage()

    await screen.findByText(/^Company \*/i)
    expect(screen.getByRole('button', { name: /new doctor/i })).toBeDisabled()
    // Doctor field is gated on Division, not Company — Division is also empty at this point.
    expect(screen.getByPlaceholderText(/select a division first/i)).toBeInTheDocument()
  })

  it('keeps "New doctor" disabled after a Company is picked, until a Division is also picked', async () => {
    await mockSessionWithPermission(true)
    await mockTenants([{ id: 't-cipla', name: 'Cipla', code: 'cipla', type: 'customer' }])
    await mockProjectWithDivision()

    const user = userEvent.setup()
    await renderCreatePage()
    await pickCompany(user, 'Cipla')

    expect(screen.getByRole('button', { name: /new doctor/i })).toBeDisabled()

    await pickDivision(user)

    expect(screen.getByRole('button', { name: /new doctor/i })).toBeEnabled()
  })

  it('creating a doctor auto-selects it and leaves the rest of the draft intact', async () => {
    await mockSessionWithPermission(true)
    await mockTenants([{ id: 't-cipla', name: 'Cipla', code: 'cipla', type: 'customer' }])
    await mockProjectWithDivision()
    const { doctorsService } = await import('@/features/doctors/doctors.service')
    vi.mocked(doctorsService.createDoctor).mockResolvedValue({
      success: true, message: '',
      data: { id: 'doc-new', pharmaCode: 'DOC-NEW', name: 'Dr. New', specialization: 'cp', mobile: '', email: '', location: null, division: 'div-1', createdAt: '', updatedAt: '', tenant: 't-cipla' },
    })

    const user = userEvent.setup()
    await renderCreatePage()
    await pickCompany(user, 'Cipla')
    await pickDivision(user)
    await pickProject(user)

    // Proves opening/closing the inline doctor modal doesn't wipe unrelated Camp draft state.
    const notes = screen.getByPlaceholderText('Optional')
    await user.type(notes, 'Keep this camp note')

    await user.click(screen.getByRole('button', { name: /new doctor/i }))
    await screen.findByRole('dialog')
    expect(screen.getByText(/locked to the camp being booked/i)).toBeInTheDocument()
    expect(screen.getByText(/locked to the selected division/i)).toBeInTheDocument()

    await fillNewDoctorRequiredFields(user)
    await user.click(screen.getByRole('button', { name: /^add doctor$/i }))

    await waitFor(() => expect(doctorsService.createDoctor).toHaveBeenCalledTimes(1))
    const payload = vi.mocked(doctorsService.createDoctor).mock.calls[0][0]
    expect(payload.tenant).toBe('t-cipla')

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByText(/dr\. new/i)).toBeInTheDocument()
    expect(screen.getByDisplayValue('Keep this camp note')).toBeInTheDocument()
  })

  it('clears the selected doctor and any locally-added doctor when the Company changes', async () => {
    await mockSessionWithPermission(true)
    // Both companies mocked upfront — useTenants fetches once, so a mid-test mock swap wouldn't be reflected.
    await mockTenants([
      { id: 't-cipla', name: 'Cipla', code: 'cipla', type: 'customer' },
      { id: 't-sun', name: 'Sun Pharma', code: 'sunpharma', type: 'customer' },
    ])
    await mockProjectWithDivision()
    const { doctorsService } = await import('@/features/doctors/doctors.service')
    vi.mocked(doctorsService.createDoctor).mockResolvedValue({
      success: true, message: '',
      data: { id: 'doc-new', pharmaCode: 'DOC-NEW', name: 'Dr. New', specialization: 'cp', mobile: '', email: '', location: null, division: 'div-1', createdAt: '', updatedAt: '', tenant: 't-cipla' },
    })

    const user = userEvent.setup()
    await renderCreatePage()
    await pickCompany(user, 'Cipla')
    await pickDivision(user)
    await pickProject(user)

    await user.click(screen.getByRole('button', { name: /new doctor/i }))
    await fillNewDoctorRequiredFields(user)
    await user.click(screen.getByRole('button', { name: /^add doctor$/i }))

    await waitFor(() => expect(screen.getByText(/dr\. new/i)).toBeInTheDocument())

    const companyLabel = screen.getByText(/^Company \*/i)
    const trigger = companyLabel.parentElement!.querySelector('[role="combobox"]')!
    await user.click(trigger)
    const otherOption = await screen.findByRole('option', { name: /sun pharma/i })
    await user.click(otherOption)

    expect(screen.queryByText(/dr\. new/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/select company first/i)).not.toBeInTheDocument()
    expect(screen.getAllByPlaceholderText(/select a division first/i)).toHaveLength(2)
  })

  it('Cancel creates no doctor and leaves the camp form untouched', async () => {
    await mockSessionWithPermission(true)
    await mockTenants([{ id: 't-cipla', name: 'Cipla', code: 'cipla', type: 'customer' }])
    await mockProjectWithDivision()
    const { doctorsService } = await import('@/features/doctors/doctors.service')

    const user = userEvent.setup()
    await renderCreatePage()
    await pickCompany(user, 'Cipla')
    await pickDivision(user)
    await pickProject(user)

    await user.click(screen.getByRole('button', { name: /new doctor/i }))
    await screen.findByRole('dialog')

    await user.click(screen.getByRole('button', { name: /^cancel$/i }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(doctorsService.createDoctor).not.toHaveBeenCalled()
  })
})

describe('CampDetailPageReal — Division/Project field interplay', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    sessionStorage.clear()
    useAuthStore.getState().clearAuth()
  })

  // Lets a genuine project.division !== picked Division mismatch be constructed (default mock has only one).
  async function mockTwoDivisions() {
    const { divisionService } = await import('@/features/crm/divisions/division.service')
    vi.mocked(divisionService.searchDivisions).mockResolvedValue({
      success: true,
      message: '',
      data: {
        items: [
          { id: 'div-1', name: 'Cardiology', code: 'cardio', tenant: 't-cipla', therapy: [], mrCount: 0, createdAt: '', updatedAt: '' },
          { id: 'div-2', name: 'Oncology', code: 'onco', tenant: 't-cipla', therapy: [], mrCount: 0, createdAt: '', updatedAt: '' },
        ],
        count: 2,
      } as never,
    })
  }

  it('rejects a picked Project whose division does not match the chosen Division, without overwriting the Division field', async () => {
    await mockSessionWithPermission(true)
    await mockTenants([{ id: 't-cipla', name: 'Cipla', code: 'cipla', type: 'customer' }])
    await mockTwoDivisions()
    const { projectsService } = await import('@/features/projects/projects.service')
    // Project belongs to div-2 (Oncology); the user is about to pick div-1 (Cardiology) instead.
    vi.mocked(projectsService.searchProjects).mockResolvedValue({
      success: true,
      message: '',
      data: { items: [{ id: 'proj-1', code: 'prj-001', name: 'Cipla Project Mismatched', status: 'new', division: 'div-2', campTimeSlots: ['9am-1pm'], tests: [] }], count: 1 },
    } as never)

    const user = userEvent.setup()
    await renderCreatePage()
    await pickCompany(user, 'Cipla')
    await pickDivision(user, 'Cardiology')
    await pickProject(user)

    expect(await screen.findByText(/doesn't belong to the selected division/i)).toBeInTheDocument()
    const divisionLabel = screen.getByText(/^Division \*/i)
    const divisionTrigger = divisionLabel.parentElement!.querySelector('[role="combobox"]')!
    expect(divisionTrigger).toHaveTextContent(/cardiology/i)
    expect(screen.queryByText(/cipla project mismatched/i)).not.toBeInTheDocument()
  })

  it('clears Project/Doctor/Time slot (but not MR/FO) when Division changes, after a Project was already picked', async () => {
    await mockSessionWithPermission(true)
    await mockTenants([{ id: 't-cipla', name: 'Cipla', code: 'cipla', type: 'customer' }])
    await mockTwoDivisions()
    const { projectsService } = await import('@/features/projects/projects.service')
    vi.mocked(projectsService.searchProjects).mockResolvedValue({
      success: true,
      message: '',
      data: { items: [{ id: 'proj-1', code: 'prj-001', name: 'Cipla Project Cardio', status: 'new', division: 'div-1', campTimeSlots: ['9am-1pm'], tests: [] }], count: 1 },
    } as never)
    const { doctorsService } = await import('@/features/doctors/doctors.service')
    vi.mocked(doctorsService.searchDoctors).mockResolvedValue({
      success: true, message: '', data: { items: [{ id: 'doc-1', pharmaCode: 'DOC-1', name: 'Dr. Cardio Doe', specialization: 'cp', mobile: '9876543210', email: 'd@example.com', location: null, division: 'div-1', createdAt: '', updatedAt: '' }], count: 1 },
    } as never)
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    vi.mocked(accessManagementService.searchRoleTypes).mockImplementation(async (q) => ({
      success: true, message: '', data: { items: [{ id: `rt-${q.code}`, code: q.code }], count: 1 },
    }) as never)
    vi.mocked(accessManagementService.searchRoles).mockImplementation(async (q) => {
      const items = q.type === 'rt-pharma-mr' ? [{ id: 'mr-cipla', code: 'phr-001', name: 'Cipla MR', permissions: [], status: 'active', type: 'rt-pharma-mr', user: 'u-2', tenant: 't-cipla', createdAt: '', updatedAt: '' } as RoleEntity] : []
      return { success: true, message: '', data: { items, count: items.length } } as never
    })
    const { geoProfileService } = await import('@/features/geo-profile/geoProfile.service')
    vi.mocked(geoProfileService.nearestGeoProfiles).mockResolvedValue({
      success: true,
      message: '',
      data: {
        items: [{
          id: 'geo-1', tenant: 't-1', role: 'fo-cipla', type: 'fo', status: 'active',
          coordinates: [77.02, 28.52], coverageRadius: 35000, meta: {},
          addressLine1: null, addressLine2: null, locality: null, city: null, state: null,
          country: null, pincode: null, googlePlaceId: null, createdAt: '', updatedAt: '',
          distance: 5000,
        }],
        count: 1,
      },
    } as never)
    vi.mocked(accessManagementService.getRole).mockResolvedValue({
      success: true, message: '', data: { id: 'fo-cipla', code: 'fo-001', name: 'Cipla FO', permissions: [], status: 'active', type: 'rt-field-officer', user: 'u-3', tenant: 't-cipla', createdAt: '', updatedAt: '' } as RoleEntity,
    } as never)

    const user = userEvent.setup()
    await renderCreatePage()
    await pickCompany(user, 'Cipla')
    await pickDivision(user, 'Cardiology')
    await pickProject(user)
    expect(await screen.findByText(/cipla project cardio/i)).toBeInTheDocument()

    const mrSearchInput = await screen.findByPlaceholderText(/search mr by name/i)
    await user.type(mrSearchInput, 'Cipla')
    await user.click(await screen.findByText(/cipla mr/i, {}, { timeout: 3000 }))

    await user.click(screen.getByRole('button', { name: /set test coordinates/i }))
    await pickCampDate(user, '2026-09-20')
    const timeSlotLabel = screen.getByText(/time slot \*/i)
    const timeSlotTrigger = timeSlotLabel.parentElement!.querySelector('[role="combobox"]')!
    await user.click(timeSlotTrigger)
    await user.click((await screen.findAllByRole('option'))[0])

    const foSearchInput = await screen.findByPlaceholderText(/search fo by name/i)
    await user.click(foSearchInput)
    await user.click(await screen.findByText(/cipla fo/i, {}, { timeout: 3000 }))

    const doctorSearchInput = screen.getByPlaceholderText(/search doctor by name/i)
    await user.type(doctorSearchInput, 'Cardio')
    await user.click(await screen.findByText(/dr\. cardio doe/i, {}, { timeout: 3000 }))

    expect(screen.getByText(/cipla mr/i)).toBeInTheDocument()
    expect(screen.getByText(/cipla fo/i)).toBeInTheDocument()
    expect(screen.getByText(/dr\. cardio doe/i)).toBeInTheDocument()

    await pickDivision(user, 'Oncology')

    expect(screen.queryByText(/cipla project cardio/i)).not.toBeInTheDocument()
    expect(screen.getByPlaceholderText(/search or browse projects/i)).toBeInTheDocument()
    expect(screen.queryByText(/dr\. cardio doe/i)).not.toBeInTheDocument()
    expect(screen.getByPlaceholderText(/search doctor by name/i)).toBeInTheDocument()
    // SelectValue's placeholder is a render-prop, never lands in the DOM as text — assert disabled+empty instead.
    const clearedTimeSlotLabel = screen.getByText(/time slot \*/i)
    const clearedTimeSlotTrigger = clearedTimeSlotLabel.parentElement!.querySelector('[role="combobox"]')!
    expect(clearedTimeSlotTrigger).toBeDisabled()
    expect(clearedTimeSlotTrigger).toHaveAttribute('data-placeholder')
    expect(clearedTimeSlotTrigger).not.toHaveTextContent(/9am|am-1pm/i)

    expect(screen.getByText(/cipla mr/i)).toBeInTheDocument()
    expect(screen.getByText(/cipla fo/i)).toBeInTheDocument()
  })

  it('retains the chosen Division when the Project is cleared (Division is picked independently, before Project, now)', async () => {
    await mockSessionWithPermission(true)
    await mockTenants([{ id: 't-cipla', name: 'Cipla', code: 'cipla', type: 'customer' }])
    await mockProjectWithDivision()

    const user = userEvent.setup()
    await renderCreatePage()
    await pickCompany(user, 'Cipla')
    await pickDivision(user)
    await pickProject(user)
    expect(await screen.findByText(/cipla project/i)).toBeInTheDocument()

    const projectLabel = screen.getByText(/^Project \*/i)
    const clearButton = projectLabel.parentElement!.querySelector('[aria-label="Clear selected project"]')
    expect(clearButton).not.toBeNull()
    await user.click(clearButton!)

    const divisionLabel = screen.getByText(/^Division \*/i)
    const divisionTrigger = divisionLabel.parentElement!.querySelector('[role="combobox"]')!
    expect(divisionTrigger).toHaveTextContent(/cardiology/i)
    expect(screen.getByPlaceholderText(/search or browse projects/i)).toBeInTheDocument()
  })

  it('picking a project narrows the Type select to only what the project offers, matching the backend\'s own hard 400 (project.type.includes(campType))', async () => {
    await mockSessionWithPermission(true)
    await mockTenants([{ id: 't-cipla', name: 'Cipla', code: 'cipla', type: 'customer' }])
    const { projectsService } = await import('@/features/projects/projects.service')
    // A diet-only project — Screening/Lab must disappear from the Type picker once it's chosen.
    vi.mocked(projectsService.searchProjects).mockResolvedValue({
      success: true,
      message: '',
      data: { items: [{ id: 'proj-1', code: 'prj-001', name: 'Cipla Project', status: 'new', division: 'div-1', campTimeSlots: ['9am-1pm'], tests: [], type: ['diet'] }], count: 1 },
    } as never)

    const user = userEvent.setup()
    await renderCreatePage()
    await pickCompany(user, 'Cipla')
    await pickDivision(user)

    const typeLabel = screen.getByText(/^Type$/i)
    const typeTrigger = typeLabel.parentElement!.querySelector('[role="combobox"]')!

    // Before any project is picked, every real camp type is still offered.
    await user.click(typeTrigger)
    expect(await screen.findByRole('option', { name: /^Screening$/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /^Diet$/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /^Lab$/i })).toBeInTheDocument()
    await user.click(screen.getByRole('option', { name: /^Screening$/i }))

    await pickProject(user)

    // The draft's type (Screening) is no longer valid for this diet-only project — auto-corrected
    // to the project's own first offered type (Diet), not left silently invalid.
    expect(typeTrigger).toHaveTextContent(/^Diet/i)

    // And the picker itself now only offers what the project actually allows.
    await user.click(typeTrigger)
    expect(await screen.findByRole('option', { name: /^Diet$/i })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: /^Screening$/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('option', { name: /^Lab$/i })).not.toBeInTheDocument()
  })
})

describe('CampDetailPageReal — arriving from a type-scoped page (Screening/Diet Camps)', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    sessionStorage.clear()
    useAuthStore.getState().clearAuth()
  })

  it('with no type/from params (plain "Camp Management" → New camp), Type is editable and Back goes to /camps', async () => {
    await mockSessionWithPermission(true)
    await renderCreatePage('/camps/new')

    const typeLabel = await screen.findByText(/^Type$/i)
    const typeTrigger = typeLabel.parentElement!.querySelector('[role="combobox"]')!
    expect(typeTrigger).not.toBeDisabled()
    expect(screen.queryByText(/set from the page you booked this camp from/i)).not.toBeInTheDocument()

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /back to camps/i }))
    expect(await screen.findByText('Camp Management page')).toBeInTheDocument()
  })

  it('with type=diet, Type is pre-filled to Diet and locked, with an explanatory note', async () => {
    await mockSessionWithPermission(true)
    await renderCreatePage('/camps/new?type=diet')

    const typeLabel = await screen.findByText(/^Type$/i)
    const typeTrigger = typeLabel.parentElement!.querySelector('[role="combobox"]')!
    expect(typeTrigger).toBeDisabled()
    expect(typeTrigger).toHaveTextContent(/diet/i)
    expect(screen.getByText(/set from the page you booked this camp from/i)).toBeInTheDocument()
  })

  it('with an invalid type value, Type falls back to editable/unlocked (defensive — no crash on a malformed query param)', async () => {
    await mockSessionWithPermission(true)
    await renderCreatePage('/camps/new?type=not-a-real-type')

    const typeLabel = await screen.findByText(/^Type$/i)
    const typeTrigger = typeLabel.parentElement!.querySelector('[role="combobox"]')!
    expect(typeTrigger).not.toBeDisabled()
  })

  it('Back to camps navigates to the `from` param instead of /camps when present', async () => {
    await mockSessionWithPermission(true)
    const user = userEvent.setup()
    await renderCreatePage('/camps/new?type=screening&from=%2Fcamps%2Fscreening')

    await user.click(await screen.findByRole('button', { name: /back to camps/i }))
    expect(await screen.findByText('Screening Camps page')).toBeInTheDocument()
  })
})

describe('CampDetailPageReal — create mode, MR/FO pickers', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    sessionStorage.clear()
    useAuthStore.getState().clearAuth()
  })

  async function mockRoleTypesAndRoles(rolesByCode: Record<string, RoleEntity[]>) {
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    vi.mocked(accessManagementService.searchRoleTypes).mockImplementation(async (q) => ({
      success: true, message: '', data: { items: [{ id: `rt-${q.code}`, code: q.code }], count: 1 },
    }) as never)
    vi.mocked(accessManagementService.searchRoles).mockImplementation(async (q) => {
      const roleTypeCode = q.type === 'rt-pharma-mr' ? 'pharma-mr' : undefined
      const items = roleTypeCode ? rolesByCode[roleTypeCode] ?? [] : []
      return { success: true, message: '', data: { items, count: items.length } } as never
    })
  }

  // Time Slot has no options until a project (carrying campTimeSlots) is picked.
  // division: 'div-1' matches the default divisionService mock's only division ("Cardiology").
  async function mockProjectWithSlots() {
    const { projectsService } = await import('@/features/projects/projects.service')
    vi.mocked(projectsService.searchProjects).mockResolvedValue({
      success: true,
      message: '',
      data: {
        items: [{
          id: 'proj-1', code: 'prj-001', name: 'Cipla Project', status: 'new',
          // Offers both screening and diet — some tests using this fixture switch the camp's own
          // Type between the two (see the dietitian worker-switch test below).
          division: 'div-1', campTimeSlots: ['9am-1pm'], tests: [], type: ['screening', 'diet'],
        }],
        count: 1,
      },
    } as never)
  }

  async function pickProject(user: ReturnType<typeof userEvent.setup>) {
    const projectInput = await screen.findByPlaceholderText(/search or browse projects/i)
    await user.type(projectInput, 'Cipla')
    await user.click(await screen.findByText(/cipla project/i, {}, { timeout: 3000 }))
  }

  // FO eligibility is coverage-radius-based (GET /geo-profiles/nearest), not
  // a name search — mock that path instead of searchRoles for FO fixtures.
  async function mockNearestFo(role: RoleEntity | null) {
    const { geoProfileService } = await import('@/features/geo-profile/geoProfile.service')
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    vi.mocked(geoProfileService.nearestGeoProfiles).mockResolvedValue({
      success: true,
      message: '',
      data: {
        items: role ? [{
          id: 'geo-1', tenant: 't-1', role: role.id, type: 'fo', status: 'active',
          coordinates: [77.02, 28.52], coverageRadius: 35000, meta: {},
          addressLine1: null, addressLine2: null, locality: null, city: null, state: null,
          country: null, pincode: null, googlePlaceId: null, createdAt: '', updatedAt: '',
          distance: 5000,
        }] : [],
        count: role ? 1 : 0,
      },
    } as never)
    if (role) {
      vi.mocked(accessManagementService.getRole).mockResolvedValue({ success: true, message: '', data: role } as never)
    }
  }

  it('changing Company clears MR, MR label, FO, and FO label together', async () => {
    await mockSessionWithPermission(true)
    await mockTenants([
      { id: 't-cipla', name: 'Cipla', code: 'cipla', type: 'customer' },
      { id: 't-sun', name: 'Sun Pharma', code: 'sunpharma', type: 'customer' },
    ])
    await mockRoleTypesAndRoles({
      'pharma-mr': [{ id: 'mr-cipla', code: 'phr-001', name: 'Cipla MR', permissions: [], status: 'active', type: 'rt-pharma-mr', user: 'u-2', tenant: 't-cipla', createdAt: '', updatedAt: '' } as RoleEntity],
    })
    await mockNearestFo({ id: 'fo-cipla', code: 'fo-001', name: 'Cipla FO', permissions: [], status: 'active', type: 'rt-field-officer', user: 'u-3', tenant: 't-cipla', createdAt: '', updatedAt: '' } as RoleEntity)
    await mockProjectWithSlots()

    const user = userEvent.setup()
    await renderCreatePage()
    await pickCompany(user, 'Cipla')
    await pickDivision(user)
    await pickProject(user)

    const mrSearchInput = await screen.findByPlaceholderText(/search mr by name/i)
    await user.type(mrSearchInput, 'Cipla')
    await user.click(await screen.findByText(/cipla mr/i, {}, { timeout: 3000 }))

    // FO picker needs real coordinates AND date+timeSlot before it's usable at
    // all (coverage-radius + availability eligibility).
    await user.click(screen.getByRole('button', { name: /set test coordinates/i }))
    await pickCampDate(user, '2026-09-20')
    const timeSlotLabel = screen.getByText(/time slot \*/i)
    const timeSlotTrigger = timeSlotLabel.parentElement!.querySelector('[role="combobox"]')!
    await user.click(timeSlotTrigger)
    await user.click((await screen.findAllByRole('option'))[0])

    const foSearchInput = await screen.findByPlaceholderText(/search fo by name/i)
    await user.click(foSearchInput)
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
    // Company change also clears timeSlot now, so FO's date+slot eligibility gate re-closes.
    expect(await screen.findByPlaceholderText(/pick a date and time slot first/i)).toBeInTheDocument()
  })

  it('switching Type from Screening to Diet clears a picked FO (and its label) rather than sending both fo and dietitian', async () => {
    await mockSessionWithPermission(true)
    await mockTenants([{ id: 't-cipla', name: 'Cipla', code: 'cipla', type: 'customer' }])
    await mockRoleTypesAndRoles({
      'pharma-mr': [{ id: 'mr-cipla', code: 'phr-001', name: 'Cipla MR', permissions: [], status: 'active', type: 'rt-pharma-mr', user: 'u-2', tenant: 't-cipla', createdAt: '', updatedAt: '' } as RoleEntity],
    })
    await mockNearestFo({ id: 'fo-cipla', code: 'fo-001', name: 'Cipla FO', permissions: [], status: 'active', type: 'rt-field-officer', user: 'u-3', tenant: 't-cipla', createdAt: '', updatedAt: '' } as RoleEntity)
    await mockProjectWithSlots()

    const user = userEvent.setup()
    await renderCreatePage()
    await pickCompany(user, 'Cipla')
    await pickDivision(user)
    await pickProject(user)

    await user.click(screen.getByRole('button', { name: /set test coordinates/i }))
    await pickCampDate(user, '2026-09-20')
    const timeSlotLabel = screen.getByText(/time slot \*/i)
    const timeSlotTrigger = timeSlotLabel.parentElement!.querySelector('[role="combobox"]')!
    await user.click(timeSlotTrigger)
    await user.click((await screen.findAllByRole('option'))[0])

    const foSearchInput = await screen.findByPlaceholderText(/search fo by name/i)
    await user.click(foSearchInput)
    await user.click(await screen.findByText(/cipla fo/i, {}, { timeout: 3000 }))
    expect(screen.getByText(/cipla fo/i)).toBeInTheDocument()

    const typeLabel = screen.getByText(/^Type$/i)
    const typeTrigger = typeLabel.parentElement!.querySelector('[role="combobox"]')!
    await user.click(typeTrigger)
    await user.click(await screen.findByRole('option', { name: /^Diet$/i }))

    // The FO's label is gone — the field swapped to the (empty) Dietitian picker.
    // Date/timeSlot/location stay intact, so the picker reaches its own "Search…" state (not the gate placeholder).
    expect(screen.queryByText(/cipla fo/i)).not.toBeInTheDocument()
    expect(screen.getByText(/^Dietitian \(optional/i)).toBeInTheDocument()
    expect(await screen.findByPlaceholderText(/search dietitian by name/i)).toBeInTheDocument()
  })

  it('the FO picker is disabled until a Company is selected', async () => {
    await mockSessionWithPermission(true)
    await renderCreatePage()

    const foLabel = await screen.findByText(/field officer \(optional/i)
    const foInput = foLabel.parentElement!.querySelector('input')!
    expect(foInput).toBeDisabled()
  })

  it('the FO picker shows a "Pick a location first" placeholder until a location is set, even after a Company is picked', async () => {
    await mockSessionWithPermission(true)
    await mockTenants([{ id: 't-cipla', name: 'Cipla', code: 'cipla', type: 'customer' }])

    const user = userEvent.setup()
    await renderCreatePage()
    await pickCompany(user, 'Cipla')

    expect(await screen.findByPlaceholderText('Pick a location first')).toBeInTheDocument()
  })

  it('FO search uses the coverage-radius lookup (GET /geo-profiles/nearest), not a name-based Role search — a platform-tenant-only RoleType has no meaningful tenant-scoped name search left in this picker', async () => {
    await mockSessionWithPermission(true)
    await mockTenants([{ id: 't-cipla', name: 'Cipla', code: 'cipla', type: 'customer' }])
    await mockNearestFo(null)
    await mockProjectWithSlots()
    const { geoProfileService } = await import('@/features/geo-profile/geoProfile.service')

    const user = userEvent.setup()
    await renderCreatePage()
    await pickCompany(user, 'Cipla')
    await pickDivision(user)
    await pickProject(user)
    await user.click(screen.getByRole('button', { name: /set test coordinates/i }))
    await pickCampDate(user, '2026-09-20')
    const timeSlotLabel = screen.getByText(/time slot \*/i)
    const timeSlotTrigger = timeSlotLabel.parentElement!.querySelector('[role="combobox"]')!
    await user.click(timeSlotTrigger)
    await user.click((await screen.findAllByRole('option'))[0])

    const foSearchInput = await screen.findByPlaceholderText(/search fo by name/i)
    await user.click(foSearchInput)

    await waitFor(() => expect(geoProfileService.nearestGeoProfiles).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'fo', lng: 77.02, lat: 28.52, date: '2026-09-20' }),
    ))
  })
})

describe('CampDetailPageReal — draft persistence', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    sessionStorage.clear()
    useAuthStore.getState().clearAuth()
  })

  // Mirrors campDraft.store.ts's own key format exactly — a mismatch here would silently
  // seed a draft the page's own store instance never reads.
  function draftStorageKey(userId: string) {
    return `qms:draft:new-camp:v1:${userId}`
  }

  function seedDraft(userId: string, snapshot: Record<string, unknown>) {
    sessionStorage.setItem(draftStorageKey(userId), JSON.stringify({ state: { draft: snapshot, savedAt: Date.now() }, version: 1 }))
  }

  // Draft-seeding tests pick their own userId first, so they can't use renderCreatePage().
  async function renderWithUser(userId: string, initialPath = '/camps/new') {
    useAuthStore.getState().setAuth({ id: userId, email: 'system@gmail.com', firstName: 'System', lastName: 'User' })
    const CampDetailPageReal = (await import('./CampDetailPageReal')).default
    const queryClient = makeQueryClient()
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialPath]}>
          <Routes>
            <Route path="/camps/new" element={<CampDetailPageReal />} />
            <Route path="/camps" element={<div>Camp Management page</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )
  }

  it('shows no resume decision view and the real form when no draft exists', async () => {
    await mockSessionWithPermission(true)
    await mockTenants([])
    await renderWithUser('camp-draft-user-1')

    expect(await screen.findByText(/^Company \*/i)).toBeInTheDocument()
    expect(screen.queryByText(/unsaved camp from earlier/i)).not.toBeInTheDocument()
  })

  it('shows the resume decision view (not the editable form) when a draft exists, and does not overwrite it while undecided', async () => {
    await mockSessionWithPermission(true)
    await mockTenants([])
    const userId = 'camp-draft-user-2'
    seedDraft(userId, { draft: { tenant: 't-cipla' }, projectLabel: '', doctorLabel: '', mrLabel: '', foLabel: '', dietitianLabel: '', deviceLabels: {} })

    await renderWithUser(userId)

    expect(await screen.findByText(/unsaved camp from earlier/i)).toBeInTheDocument()
    expect(screen.queryByText(/^Company \*/i)).not.toBeInTheDocument()

    const raw = sessionStorage.getItem(draftStorageKey(userId))
    expect(JSON.parse(raw as string).state.draft.draft.tenant).toBe('t-cipla')
  })

  it('Resume restores the saved company label into the live form', async () => {
    await mockSessionWithPermission(true)
    await mockTenants([{ id: 't-cipla', name: 'Cipla', code: 'cipla', type: 'customer' }])
    const userId = 'camp-draft-user-3'
    seedDraft(userId, {
      draft: { tenant: 't-cipla', division: '', project: '', doctor: '', type: 'screening', billingType: 'billable', patientExpectation: '', fo: '', dietitian: '', mr: '', date: '', timeSlot: '', location: null, devices: '', notes: '' },
      projectLabel: '', doctorLabel: '', mrLabel: '', foLabel: '', dietitianLabel: '', deviceLabels: {},
    })

    await renderWithUser(userId)
    await userEvent.setup().click(await screen.findByRole('button', { name: /^Resume$/i }))

    await screen.findByText(/^Company \*/i)
    expect(screen.getByText(/^Cipla/)).toBeInTheDocument()
  })

  it('Discard clears the draft and starts fresh — reopening shows no decision view', async () => {
    await mockSessionWithPermission(true)
    await mockTenants([])
    const userId = 'camp-draft-user-4'
    seedDraft(userId, { draft: { tenant: 't-cipla' }, projectLabel: '', doctorLabel: '', mrLabel: '', foLabel: '', dietitianLabel: '', deviceLabels: {} })
    const { unmount } = await renderWithUser(userId)

    await userEvent.setup().click(await screen.findByRole('button', { name: /^Discard$/i }))
    await screen.findByText(/^Company \*/i)
    expect(sessionStorage.getItem(draftStorageKey(userId))).toBeNull()

    unmount()
    await renderWithUser(userId)
    expect(await screen.findByText(/^Company \*/i)).toBeInTheDocument()
    expect(screen.queryByText(/unsaved camp from earlier/i)).not.toBeInTheDocument()
  })

  it('a real interaction, closing, and reopening offers Resume with the exact value — end-to-end debounce→persist→rehydrate', async () => {
    await mockSessionWithPermission(true)
    await mockTenants([{ id: 't-cipla', name: 'Cipla', code: 'cipla', type: 'customer' }])
    const userId = 'camp-draft-user-5'
    const user = userEvent.setup()
    const { unmount } = await renderWithUser(userId)
    await screen.findByText(/^Company \*/i)

    await pickCompany(user, 'Cipla')

    await waitFor(
      () => {
        const raw = sessionStorage.getItem(draftStorageKey(userId))
        expect(raw).not.toBeNull()
        expect(JSON.parse(raw as string).state.draft.draft.tenant).toBe('t-cipla')
      },
      { timeout: 2000 },
    )

    unmount()
    await renderWithUser(userId)
    expect(await screen.findByText(/unsaved camp from earlier/i)).toBeInTheDocument()

    await user.click(await screen.findByRole('button', { name: /^Resume$/i }))
    await screen.findByText(/^Company \*/i)
    expect(screen.getByText(/^Cipla/)).toBeInTheDocument()
  })

  it('Resume re-fetches the picked project by id — unblocks the time-slot picker instead of leaving it stuck disabled', async () => {
    await mockSessionWithPermission(true)
    await mockTenants([{ id: 't-cipla', name: 'Cipla', code: 'cipla', type: 'customer' }])
    const { projectsService } = await import('@/features/projects/projects.service')
    vi.mocked(projectsService.getProject).mockResolvedValue({
      success: true, message: '',
      data: { id: 'proj-1', code: 'prj-001', name: 'Cipla Project', status: 'live', division: 'div-1', campTimeSlots: ['9am-1pm'], tests: [], type: ['screening'] },
    } as never)

    const userId = 'camp-draft-user-6'
    // Only project id/label were ever persisted (useCampDraft's own CampDraft shape has no
    // slot for the full ProjectEntity) — this is the exact gap the resume fetch must cover.
    seedDraft(userId, {
      draft: { tenant: 't-cipla', division: 'div-1', project: 'proj-1', doctor: '', type: 'screening', billingType: 'billable', patientExpectation: '', fo: '', dietitian: '', mr: '', date: '', timeSlot: '', location: null, devices: '', notes: '' },
      projectLabel: 'Cipla Project', doctorLabel: '', mrLabel: '', foLabel: '', dietitianLabel: '', deviceLabels: {},
    })

    await renderWithUser(userId)
    await userEvent.setup().click(await screen.findByRole('button', { name: /^Resume$/i }))

    await waitFor(() => expect(projectsService.getProject).toHaveBeenCalledWith('proj-1'))

    // Time Slot was disabled ("Select a project first") before the fetch resolved pickedProject —
    // it must become the real, enabled picker once the project is rehydrated.
    const timeSlotLabel = await screen.findByText(/time slot \*/i)
    await waitFor(() => {
      const trigger = timeSlotLabel.parentElement!.querySelector('[role="combobox"]')
      expect(trigger).not.toBeDisabled()
    })
  })

  it('a draft saved for one camp type cannot flip a type-locked route\'s camp type on resume', async () => {
    await mockSessionWithPermission(true)
    await mockTenants([{ id: 't-cipla', name: 'Cipla', code: 'cipla', type: 'customer' }])

    const userId = 'camp-draft-user-7'
    // Saved while booking a screening camp from the generic /camps/new flow.
    seedDraft(userId, {
      draft: { tenant: 't-cipla', division: '', project: '', doctor: '', type: 'screening', billingType: 'billable', patientExpectation: '', fo: '', dietitian: '', mr: '', date: '', timeSlot: '', location: null, devices: '', notes: '' },
      projectLabel: '', doctorLabel: '', mrLabel: '', foLabel: '', dietitianLabel: '', deviceLabels: {},
    })

    // Resumed from the Diet Camps page's own type-locked route instead.
    await renderWithUser(userId, '/camps/new?type=diet')
    await userEvent.setup().click(await screen.findByRole('button', { name: /^Resume$/i }))

    await screen.findByText(/^Company \*/i)
    const typeLabel = screen.getByText(/^Type$/i)
    const typeTrigger = typeLabel.parentElement!.querySelector('[role="combobox"]')!
    // The locked type must win — not the draft's saved 'screening'.
    expect(typeTrigger).toHaveTextContent(/diet/i)
    expect(typeTrigger).toBeDisabled()
  })

  it('a resumed project incompatible with a type-locked route is cleared with an explicit message, not silently submitted', async () => {
    await mockSessionWithPermission(true)
    await mockTenants([{ id: 't-cipla', name: 'Cipla', code: 'cipla', type: 'customer' }])
    const { projectsService } = await import('@/features/projects/projects.service')
    // Screening-only project — incompatible with the ?type=diet route below.
    vi.mocked(projectsService.getProject).mockResolvedValue({
      success: true, message: '',
      data: { id: 'proj-1', code: 'prj-001', name: 'Cipla Project', status: 'live', division: 'div-1', campTimeSlots: ['9am-1pm'], tests: [], type: ['screening'] },
    } as never)

    const userId = 'camp-draft-user-8'
    seedDraft(userId, {
      draft: { tenant: 't-cipla', division: 'div-1', project: 'proj-1', doctor: '', type: 'screening', billingType: 'billable', patientExpectation: '', fo: '', dietitian: '', mr: '', date: '', timeSlot: '', location: null, devices: '', notes: '' },
      projectLabel: 'Cipla Project', doctorLabel: '', mrLabel: '', foLabel: '', dietitianLabel: '', deviceLabels: {},
    })

    await renderWithUser(userId, '/camps/new?type=diet')
    await userEvent.setup().click(await screen.findByRole('button', { name: /^Resume$/i }))

    await screen.findByText(/doesn't support this camp type/i)
    // The project field must be cleared, not left showing the incompatible project as picked.
    expect(screen.queryByText('Cipla Project')).not.toBeInTheDocument()
    expect(screen.queryByText(/devices required/i)).not.toBeInTheDocument()
  })

  it('a resumed project that fails to load (deleted/no access) is cleared with an explicit error, not left silently stuck', async () => {
    await mockSessionWithPermission(true)
    await mockTenants([{ id: 't-cipla', name: 'Cipla', code: 'cipla', type: 'customer' }])
    const { projectsService } = await import('@/features/projects/projects.service')
    vi.mocked(projectsService.getProject).mockRejectedValue(new Error('404'))

    const userId = 'camp-draft-user-9'
    seedDraft(userId, {
      draft: { tenant: 't-cipla', division: 'div-1', project: 'proj-deleted', doctor: '', type: 'screening', billingType: 'billable', patientExpectation: '', fo: '', dietitian: '', mr: '', date: '', timeSlot: '', location: null, devices: '', notes: '' },
      projectLabel: 'Deleted Project', doctorLabel: '', mrLabel: '', foLabel: '', dietitianLabel: '', deviceLabels: {},
    })

    await renderWithUser(userId)
    await userEvent.setup().click(await screen.findByRole('button', { name: /^Resume$/i }))

    await screen.findByText(/couldn't load this draft's project/i)
    expect(screen.queryByText('Deleted Project')).not.toBeInTheDocument()
    // Time Slot stays correctly gated — no stale-looking "picked" project left behind.
    const timeSlotLabel = screen.getByText(/time slot \*/i)
    const trigger = timeSlotLabel.parentElement!.querySelector('[role="combobox"]')
    expect(trigger).toBeDisabled()
  })
})
