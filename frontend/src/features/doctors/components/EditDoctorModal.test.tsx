import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from '@/components/ui/sonner'
import type { SessionResponse } from '@/types/accessManagement.types'
import type { DoctorEntity } from '@/types/doctor.types'

vi.mock('@/hooks/useSession')

vi.mock('@/components/ui/sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

vi.mock('@/features/doctors/doctors.service', () => ({
  doctorsService: {
    createDoctor: vi.fn(async () => ({ success: true, message: '', data: {} })),
    updateDoctor: vi.fn(async () => ({ success: true, message: '', data: {} })),
    bulkCreateDoctors: vi.fn(async () => ({
      totalRows: 1, validRows: 1, invalidRows: 0, created: 1, failed: 0, errors: [],
    })),
  },
}))

vi.mock('@/features/access-management/accessManagement.service', () => ({
  accessManagementService: {
    searchTenants: vi.fn(async () => ({ success: true, message: '', data: { items: [{ id: 't-cipla', name: 'Cipla', code: 'cipla' }], count: 1 } })),
  },
}))

vi.mock('@/features/crm/divisions/division.service', () => ({
  divisionService: {
    searchDivisions: vi.fn(async () => ({
      success: true, message: '', data: { items: [{ id: 'div-1', name: 'Cardiology', code: 'cardio' }], count: 1 },
    })),
  },
}))

// Simulates picking a real point on the map — EditDoctorModal's own save-time completeness
// check requires addressLine1/city/state/pincode in addition to coordinates.
vi.mock('@/components/widgets/location-picker/LocationPicker', () => ({
  default: ({ value, onChange, onResolutionStateChange }: {
    value: unknown
    onChange: (v: unknown) => void
    onResolutionStateChange?: (status: 'idle' | 'loading' | 'error') => void
  }) => (
    <>
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
      <button type="button" onClick={() => onResolutionStateChange?.('loading')}>
        Simulate location resolving
      </button>
      <button type="button" onClick={() => onResolutionStateChange?.('error')}>
        Simulate location error
      </button>
      <button type="button" onClick={() => onResolutionStateChange?.('idle')}>
        Simulate location resolved
      </button>
    </>
  ),
}))
vi.mock('@/components/widgets/location-picker/LocationAddressFields', () => ({ default: () => null }))

function sessionFixture(tenantType: 'platform' | 'customer', division: string | null = 'div-1'): SessionResponse {
  return {
    user: { id: 'u-1', email: 'a@example.com', firstName: 'a', lastName: 'b' },
    role: { id: 'r-1', code: 'admin', name: 'Admin', division },
    roleType: { id: 'rt-1', code: 'admin', name: 'admin' },
    tenant: { id: 't-1', code: 'qms', name: 'QMS', type: tenantType },
    permissions: ['doctor:manage'],
  } as unknown as SessionResponse
}

const doctorLocationFixture = {
  addressLine1: '221 Baker Street', addressLine2: undefined, locality: undefined,
  city: 'Pune', state: 'Maharashtra', country: 'India', pincode: '411001', googlePlaceId: undefined,
  coordinates: [73.8567, 18.5204] as [number, number],
}

function doctorFixture(overrides: Partial<DoctorEntity> = {}): DoctorEntity {
  return {
    id: 'doc-1', pharmaCode: 'DOC-1', name: 'Dr. Priya Sharma', specialization: 'cp',
    mobile: '9876543210', email: 'p@example.com', location: doctorLocationFixture,
    division: 'div-1', createdAt: '', updatedAt: '', tenant: 't-1',
    ...overrides,
  } as DoctorEntity
}

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

// EditDoctorModal's labels aren't associated via htmlFor — locate the input
// by its label text's sibling instead of getByLabelText.
function inputForLabel(labelText: RegExp): HTMLInputElement {
  const label = screen.getByText(labelText)
  const input = label.parentElement?.querySelector('input')
  if (!input) throw new Error(`no input found next to label matching ${labelText}`)
  return input
}

// Same reasoning as inputForLabel, but for a Select's combobox trigger — its accessible
// name isn't reliably queryable by role+name here, so locate it via the label's sibling.
function comboboxForLabel(labelText: RegExp): HTMLElement {
  const label = screen.getByText(labelText)
  const trigger = label.parentElement?.querySelector('[role="combobox"]')
  if (!trigger) throw new Error(`no combobox found next to label matching ${labelText}`)
  return trigger as HTMLElement
}

async function mockSession(tenantType: 'platform' | 'customer', division: string | null = 'div-1') {
  const { useSession } = await import('@/hooks/useSession')
  vi.mocked(useSession).mockReturnValue({ session: sessionFixture(tenantType, division) } as unknown as ReturnType<typeof useSession>)
}

async function renderModal(doctor: DoctorEntity | null, onClose = vi.fn()) {
  const EditDoctorModal = (await import('./EditDoctorModal')).default
  const queryClient = makeQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <EditDoctorModal open doctor={doctor} onClose={onClose} />
    </QueryClientProvider>,
  )
}

async function renderModalWithCaller(opts: {
  onClose?: () => void
  onCreated?: (doctor: DoctorEntity) => void
  forcedTenant?: { id: string; label: string }
  forcedDivision?: { id: string; label: string }
}) {
  const EditDoctorModal = (await import('./EditDoctorModal')).default
  const queryClient = makeQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <EditDoctorModal
        open
        doctor={null}
        onClose={opts.onClose ?? vi.fn()}
        onCreated={opts.onCreated}
        forcedTenant={opts.forcedTenant}
        forcedDivision={opts.forcedDivision}
      />
    </QueryClientProvider>,
  )
}

// Fills in the map pin + address fields via the mocked LocationPicker's "Set test
// coordinates" button — required before any create-mode save can succeed.
async function fillLocation(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /set test coordinates/i }))
}

// Email is required on create (CreateDoctorPayloadSchema has no `.optional()`) — required before
// any create-mode save can succeed, same as fillLocation above.
async function fillEmail(user: ReturnType<typeof userEvent.setup>, value = 'newdoc@example.com') {
  await user.type(inputForLabel(/^email$/i), value)
}

// Mobile is required on create too (CreateDoctorPayloadSchema.mobile has no `.optional()`, min 10).
async function fillMobile(user: ReturnType<typeof userEvent.setup>, value = '9876543210') {
  await user.type(inputForLabel(/^mobile$/i), value)
}

describe('EditDoctorModal — dialog title', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('shows "Add doctor" when creating', async () => {
    await mockSession('customer')
    await renderModal(null)

    expect(screen.getByRole('heading', { name: /^add doctor$/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /^edit doctor$/i })).not.toBeInTheDocument()
  })

  it('shows "Edit doctor" when editing an existing doctor', async () => {
    await mockSession('customer')
    await renderModal(doctorFixture())

    expect(screen.getByRole('heading', { name: /^edit doctor$/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /^add doctor$/i })).not.toBeInTheDocument()
  })
})

describe('EditDoctorModal — tenant field', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('shows the Company field for a platform caller creating a new doctor, and blocks submit until one is picked', async () => {
    await mockSession('platform')
    const { doctorsService } = await import('@/features/doctors/doctors.service')
    const user = userEvent.setup()
    await renderModal(null)

    expect(await screen.findByText(/company \*/i)).toBeInTheDocument()

    await user.type(inputForLabel(/pharma doctor code/i), 'DOC-2')
    await user.type(inputForLabel(/doctor name/i), 'Dr. New Doc')
    await fillMobile(user)
    await fillEmail(user)
    await fillLocation(user)

    await user.click(screen.getByRole('button', { name: /add doctor/i }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Company is required'))
    expect(doctorsService.createDoctor).not.toHaveBeenCalled()
  })

  it('submits the picked tenant id for a platform caller', async () => {
    await mockSession('platform')
    const { doctorsService } = await import('@/features/doctors/doctors.service')
    const user = userEvent.setup()
    await renderModal(null)

    await user.type(inputForLabel(/pharma doctor code/i), 'DOC-2')
    await user.type(inputForLabel(/doctor name/i), 'Dr. New Doc')

    await user.type(screen.getByPlaceholderText(/search company by name/i), 'Cipla')
    const option = await screen.findByText('Cipla (cipla)')
    await user.click(option)

    await waitFor(() => expect(screen.getByText(/division \*/i)).toBeInTheDocument())
    await user.click(comboboxForLabel(/division \*/i))
    await user.click(await screen.findByText('Cardiology'))
    await fillMobile(user)
    await fillEmail(user)
    await fillLocation(user)

    await user.click(screen.getByRole('button', { name: /add doctor/i }))

    await waitFor(() => expect(doctorsService.createDoctor).toHaveBeenCalledTimes(1))
    const payload = vi.mocked(doctorsService.createDoctor).mock.calls[0][0]
    expect(payload.tenant).toBe('t-cipla')
    expect(payload.division).toBe('div-1')
  })

  it('hides the Company field for a customer-tenant caller and omits tenant from the payload', async () => {
    await mockSession('customer')
    const { doctorsService } = await import('@/features/doctors/doctors.service')
    const user = userEvent.setup()
    await renderModal(null)

    expect(screen.queryByText(/company \*/i)).not.toBeInTheDocument()

    await user.type(inputForLabel(/pharma doctor code/i), 'DOC-2')
    await user.type(inputForLabel(/doctor name/i), 'Dr. New Doc')
    await fillMobile(user)
    await fillEmail(user)
    await fillLocation(user)

    await user.click(screen.getByRole('button', { name: /add doctor/i }))

    await waitFor(() => expect(doctorsService.createDoctor).toHaveBeenCalledTimes(1))
    const payload = vi.mocked(doctorsService.createDoctor).mock.calls[0][0]
    expect(payload.tenant).toBeUndefined()
    expect(payload.division).toBe('div-1')
  })

  it('never shows the Company field in edit mode, even for a platform caller', async () => {
    await mockSession('platform')
    await renderModal(doctorFixture())

    expect(screen.queryByText(/company \*/i)).not.toBeInTheDocument()
  })
})

describe('EditDoctorModal — forcedTenant + onCreated (inline-from-camp-form callers)', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('renders forcedTenant as locked read-only text, never an editable picker, even for a platform caller', async () => {
    await mockSession('platform')
    await renderModalWithCaller({ forcedTenant: { id: 't-forced', label: 'Forced Co (forced)' } })

    expect(screen.getByText(/forced co \(forced\)/i)).toBeInTheDocument()
    expect(screen.getByText(/locked to the camp being booked/i)).toBeInTheDocument()
    expect(screen.queryByPlaceholderText(/search company by name/i)).not.toBeInTheDocument()
    // The picker's own "Company *" label (required-picker case) is absent too.
    expect(screen.queryByText(/^Company \*/i)).not.toBeInTheDocument()
  })

  it('submits forcedTenant.id regardless of session type, ignoring any picker state', async () => {
    await mockSession('customer')
    const { doctorsService } = await import('@/features/doctors/doctors.service')
    const user = userEvent.setup()
    await renderModalWithCaller({ forcedTenant: { id: 't-forced', label: 'Forced Co (forced)' } })

    await user.type(inputForLabel(/pharma doctor code/i), 'DOC-2')
    await user.type(inputForLabel(/doctor name/i), 'Dr. New Doc')
    await fillMobile(user)
    await fillEmail(user)
    await fillLocation(user)
    await user.click(screen.getByRole('button', { name: /add doctor/i }))

    await waitFor(() => expect(doctorsService.createDoctor).toHaveBeenCalledTimes(1))
    expect(vi.mocked(doctorsService.createDoctor).mock.calls[0][0].tenant).toBe('t-forced')
  })

  it('fires onCreated with the created doctor only on a genuine create success', async () => {
    await mockSession('customer')
    const { doctorsService } = await import('@/features/doctors/doctors.service')
    const created = doctorFixture({ id: 'doc-new', name: 'Dr. New' })
    vi.mocked(doctorsService.createDoctor).mockResolvedValue({ success: true, message: '', data: created })

    const onCreated = vi.fn()
    const user = userEvent.setup()
    await renderModalWithCaller({ onCreated, forcedTenant: { id: 't-forced', label: 'Forced Co' } })

    await user.type(inputForLabel(/pharma doctor code/i), 'DOC-2')
    await user.type(inputForLabel(/doctor name/i), 'Dr. New Doc')
    await fillMobile(user)
    await fillEmail(user)
    await fillLocation(user)
    await user.click(screen.getByRole('button', { name: /add doctor/i }))

    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1))
    expect(onCreated).toHaveBeenCalledWith(created)
  })

  it('never fires onCreated on Cancel/dismiss, and never calls createDoctor', async () => {
    await mockSession('customer')
    const { doctorsService } = await import('@/features/doctors/doctors.service')
    const onCreated = vi.fn()
    const onClose = vi.fn()
    const user = userEvent.setup()
    await renderModalWithCaller({ onCreated, onClose, forcedTenant: { id: 't-forced', label: 'Forced Co' } })

    await user.click(screen.getByRole('button', { name: /cancel/i }))

    expect(onCreated).not.toHaveBeenCalled()
    expect(onClose).toHaveBeenCalledTimes(1)
    // Regression test: each child form now renders its own real <form> — a Cancel button with
    // no explicit type="button" would default to type="submit" inside that <form> and
    // incorrectly trigger create on click.
    expect(doctorsService.createDoctor).not.toHaveBeenCalled()
  })

  it('never fires onCreated on an edit/update, even when the prop is supplied', async () => {
    await mockSession('customer')
    const { doctorsService } = await import('@/features/doctors/doctors.service')
    vi.mocked(doctorsService.updateDoctor).mockResolvedValue({ success: true, message: '', data: doctorFixture() })

    const onCreated = vi.fn()
    const EditDoctorModal = (await import('./EditDoctorModal')).default
    const user = userEvent.setup()
    render(
      <QueryClientProvider client={makeQueryClient()}>
        <EditDoctorModal open doctor={doctorFixture()} onClose={vi.fn()} onCreated={onCreated} />
      </QueryClientProvider>,
    )

    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => expect(doctorsService.updateDoctor).toHaveBeenCalledTimes(1))
    expect(onCreated).not.toHaveBeenCalled()
  })
})

describe('EditDoctorModal — structural regressions from the RHF/child-owned-footer refactor', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('clicking Cancel in edit mode calls neither updateDoctor nor createDoctor', async () => {
    await mockSession('customer')
    const { doctorsService } = await import('@/features/doctors/doctors.service')
    const onClose = vi.fn()
    const user = userEvent.setup()
    await renderModal(doctorFixture(), onClose)

    await user.click(screen.getByRole('button', { name: /cancel/i }))

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(doctorsService.updateDoctor).not.toHaveBeenCalled()
    expect(doctorsService.createDoctor).not.toHaveBeenCalled()
  })

  it('keeps the submit button disabled for the full mutation round trip, not just RHF\'s own synchronous validation', async () => {
    await mockSession('customer')
    const { doctorsService } = await import('@/features/doctors/doctors.service')
    let resolveCreate!: (value: { success: true; message: string; data: DoctorEntity }) => void
    vi.mocked(doctorsService.createDoctor).mockImplementation(
      () => new Promise((resolve) => { resolveCreate = resolve }),
    )
    const onClose = vi.fn()
    const user = userEvent.setup()
    await renderModal(null, onClose)

    await user.type(inputForLabel(/pharma doctor code/i), 'DOC-2')
    await user.type(inputForLabel(/doctor name/i), 'Dr. New Doc')
    await fillMobile(user)
    await fillEmail(user)
    await fillLocation(user)

    const submitButton = screen.getByRole('button', { name: /add doctor/i })
    await user.click(submitButton)

    // Still in flight — the coordinator's mutateAsync hasn't resolved yet, but RHF's own
    // synchronous resolver already passed. The button must stay disabled the whole time.
    await waitFor(() => expect(submitButton).toBeDisabled())
    expect(doctorsService.createDoctor).toHaveBeenCalledTimes(1)
    expect(submitButton).toBeDisabled()
    expect(onClose).not.toHaveBeenCalled()

    resolveCreate({ success: true, message: '', data: doctorFixture() })
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
  })

  it('clears a stale manually-set field error once the field becomes valid on the next submit attempt', async () => {
    await mockSession('customer')
    const { doctorsService } = await import('@/features/doctors/doctors.service')
    const user = userEvent.setup()
    await renderModal(doctorFixture({ email: 'old@example.com' }))

    const emailInput = inputForLabel(/^email$/i)
    await user.clear(emailInput)
    await user.click(screen.getByRole('button', { name: /save changes/i }))
    expect(await screen.findByText(/email cannot be cleared to blank/i)).toBeInTheDocument()

    await user.type(emailInput, 'new@example.com')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => expect(doctorsService.updateDoctor).toHaveBeenCalledTimes(1))
    expect(screen.queryByText(/email cannot be cleared to blank/i)).not.toBeInTheDocument()
  })
})

describe('EditDoctorModal — division field', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('shows a division picker for a platform caller once a company is picked, and resets it when the company changes', async () => {
    await mockSession('platform')
    const user = userEvent.setup()
    await renderModal(null)

    // The picker renders immediately but stays disabled until a company is picked.
    expect(comboboxForLabel(/division \*/i)).toHaveAttribute('data-disabled')

    await user.type(screen.getByPlaceholderText(/search company by name/i), 'Cipla')
    const option = await screen.findByText('Cipla (cipla)')
    await user.click(option)

    expect(await screen.findByText(/division \*/i)).toBeInTheDocument()
    await user.click(comboboxForLabel(/division \*/i))
    await user.click(await screen.findByText('Cardiology'))
    expect(screen.getByText('Cardiology')).toBeInTheDocument()
  })

  it('shows "Your assigned division" locked text for a customer-tenant caller, with no picker rendered', async () => {
    await mockSession('customer')
    await renderModal(null)

    expect(screen.getByText(/your assigned division/i)).toBeInTheDocument()
    expect(screen.queryByText(/division \*/i)).not.toBeInTheDocument()
  })

  it('shows an inline error for a customer-tenant caller with no division assigned, and blocks submit', async () => {
    await mockSession('customer', null)
    const { doctorsService } = await import('@/features/doctors/doctors.service')
    const user = userEvent.setup()
    await renderModal(null)

    expect(screen.getByText(/your account isn't assigned to a division/i)).toBeInTheDocument()

    await user.type(inputForLabel(/pharma doctor code/i), 'DOC-2')
    await user.type(inputForLabel(/doctor name/i), 'Dr. New Doc')
    await fillMobile(user)
    await fillEmail(user)
    await fillLocation(user)
    await user.click(screen.getByRole('button', { name: /add doctor/i }))

    await waitFor(() => expect(screen.getAllByText(/your account isn't assigned to a division/i).length).toBeGreaterThan(0))
    expect(doctorsService.createDoctor).not.toHaveBeenCalled()
  })

  it('renders forcedDivision as locked read-only text and submits its id, skipping the platform tenant→division picker entirely', async () => {
    await mockSession('platform')
    const { doctorsService } = await import('@/features/doctors/doctors.service')
    const user = userEvent.setup()
    await renderModalWithCaller({
      forcedTenant: { id: 't-forced', label: 'Forced Co' },
      forcedDivision: { id: 'div-forced', label: 'Oncology' },
    })

    expect(screen.getByText(/oncology/i)).toBeInTheDocument()
    expect(screen.getByText(/locked to the project's division/i)).toBeInTheDocument()
    expect(screen.queryByText(/division \*/i)).not.toBeInTheDocument()

    await user.type(inputForLabel(/pharma doctor code/i), 'DOC-2')
    await user.type(inputForLabel(/doctor name/i), 'Dr. New Doc')
    await fillMobile(user)
    await fillEmail(user)
    await fillLocation(user)
    await user.click(screen.getByRole('button', { name: /add doctor/i }))

    await waitFor(() => expect(doctorsService.createDoctor).toHaveBeenCalledTimes(1))
    expect(vi.mocked(doctorsService.createDoctor).mock.calls[0][0].division).toBe('div-forced')
  })

  it('never shows any division field or picker in edit mode', async () => {
    await mockSession('platform')
    await renderModal(doctorFixture())

    expect(screen.queryByText(/division \*/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/your assigned division/i)).not.toBeInTheDocument()
  })

  // A 403/network failure fetching divisions must never be misread as "this company genuinely
  // has zero divisions" — that silently blocked every doctor create for that tenant with no
  // indication why. The query error must be shown distinctly, with a way to retry.
  it('shows a distinct error (not "no divisions yet") and disables the picker when the divisions query fails, with a working Retry', async () => {
    await mockSession('platform')
    const { divisionService } = await import('@/features/crm/divisions/division.service')
    vi.mocked(divisionService.searchDivisions).mockRejectedValue(new Error('403'))
    const user = userEvent.setup()
    await renderModal(null)

    await user.type(screen.getByPlaceholderText(/search company by name/i), 'Cipla')
    const option = await screen.findByText('Cipla (cipla)')
    await user.click(option)

    expect(await screen.findByText(/couldn't load this company's divisions/i)).toBeInTheDocument()
    expect(screen.queryByText(/this company has no divisions yet/i)).not.toBeInTheDocument()
    expect(comboboxForLabel(/division \*/i)).toHaveAttribute('data-disabled')

    vi.mocked(divisionService.searchDivisions).mockResolvedValue({
      success: true, message: '', data: { items: [{ id: 'div-1', name: 'Cardiology', code: 'cardio' }], count: 1 },
    } as never)
    await user.click(screen.getByRole('button', { name: /retry/i }))

    await waitFor(() => expect(screen.queryByText(/couldn't load this company's divisions/i)).not.toBeInTheDocument())
    expect(comboboxForLabel(/division \*/i)).not.toHaveAttribute('data-disabled')
  })

  it('blocks submit with an inline error, without calling createDoctor, when the divisions query has failed', async () => {
    await mockSession('platform')
    const { divisionService } = await import('@/features/crm/divisions/division.service')
    vi.mocked(divisionService.searchDivisions).mockRejectedValue(new Error('403'))
    const { doctorsService } = await import('@/features/doctors/doctors.service')
    const user = userEvent.setup()
    await renderModal(null)

    await user.type(screen.getByPlaceholderText(/search company by name/i), 'Cipla')
    const option = await screen.findByText('Cipla (cipla)')
    await user.click(option)
    await screen.findByText(/couldn't load this company's divisions/i)

    await user.type(inputForLabel(/pharma doctor code/i), 'DOC-2')
    await user.type(inputForLabel(/doctor name/i), 'Dr. New Doc')
    await fillMobile(user)
    await fillEmail(user)
    await fillLocation(user)
    await user.click(screen.getByRole('button', { name: /add doctor/i }))

    expect(await screen.findByText(/retry before adding a doctor/i)).toBeInTheDocument()
    expect(doctorsService.createDoctor).not.toHaveBeenCalled()
  })
})

describe('EditDoctorModal — email field (required on create — CreateDoctorPayloadSchema.email has no .optional())', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('blocks submit with an inline error, without calling createDoctor, when email is left blank on create', async () => {
    await mockSession('customer')
    const { doctorsService } = await import('@/features/doctors/doctors.service')
    const user = userEvent.setup()
    await renderModal(null)

    await user.type(inputForLabel(/pharma doctor code/i), 'DOC-2')
    await user.type(inputForLabel(/doctor name/i), 'Dr. New Doc')
    await fillLocation(user)
    await user.click(screen.getByRole('button', { name: /add doctor/i }))

    expect(await screen.findByText(/email is required/i)).toBeInTheDocument()
    expect(doctorsService.createDoctor).not.toHaveBeenCalled()
  })

  it('includes email in the create payload when filled in', async () => {
    await mockSession('customer')
    const { doctorsService } = await import('@/features/doctors/doctors.service')
    const user = userEvent.setup()
    await renderModal(null)

    await user.type(inputForLabel(/pharma doctor code/i), 'DOC-2')
    await user.type(inputForLabel(/doctor name/i), 'Dr. New Doc')
    await fillMobile(user)
    await user.type(inputForLabel(/^email$/i), 'newdoc@example.com')
    await fillLocation(user)
    await user.click(screen.getByRole('button', { name: /add doctor/i }))

    await waitFor(() => expect(doctorsService.createDoctor).toHaveBeenCalledTimes(1))
    const payload = vi.mocked(doctorsService.createDoctor).mock.calls[0][0]
    expect(payload.email).toBe('newdoc@example.com')
  })

  it('blocks save with an inline error, without calling updateDoctor, when an existing email is cleared to blank on edit', async () => {
    await mockSession('customer')
    const { doctorsService } = await import('@/features/doctors/doctors.service')
    const user = userEvent.setup()
    await renderModal(doctorFixture({ email: 'old@example.com' }))

    const emailInput = inputForLabel(/^email$/i)
    await user.clear(emailInput)
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    expect(await screen.findByText(/email cannot be cleared to blank/i)).toBeInTheDocument()
    expect(doctorsService.updateDoctor).not.toHaveBeenCalled()
  })

  // Zod now blocks an invalid email format client-side before createDoctor is ever called (see
  // the new "shows an inline field error, blocks createDoctor" test below) — this test submits a
  // syntactically VALID payload and mocks a genuine server-side-only 400 (e.g. a duplicate
  // pharmaCode the backend rejects, which Zod's shape validation can't catch client-side) to
  // still exercise saveDoctorErrorMessage's per-field unpacking on a real server round trip.
  it('surfaces the backend\'s per-field validation reason via toast on a 400, instead of a generic "Validation Error" message', async () => {
    await mockSession('customer')
    const { doctorsService } = await import('@/features/doctors/doctors.service')
    const err = {
      isAxiosError: true,
      response: { status: 400, data: { success: false, message: 'Validation Error', data: { fields: { pharmaCode: 'Pharma code already in use' } } } },
    }
    vi.mocked(doctorsService.createDoctor).mockRejectedValue(err)

    const user = userEvent.setup()
    await renderModal(null)

    await user.type(inputForLabel(/pharma doctor code/i), 'DOC-2')
    await user.type(inputForLabel(/doctor name/i), 'Dr. New Doc')
    await fillMobile(user)
    await fillEmail(user)
    await fillLocation(user)
    await user.click(screen.getByRole('button', { name: /add doctor/i }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('pharmaCode: Pharma code already in use'))
  })

  it('shows an inline field error and blocks submit (createDoctor never called) when the email format is invalid', async () => {
    await mockSession('customer')
    const { doctorsService } = await import('@/features/doctors/doctors.service')
    const user = userEvent.setup()
    await renderModal(null)

    await user.type(inputForLabel(/pharma doctor code/i), 'DOC-2')
    await user.type(inputForLabel(/doctor name/i), 'Dr. New Doc')
    await fillMobile(user)
    await fillEmail(user, 'not-a-real-email')
    await fillLocation(user)
    await user.click(screen.getByRole('button', { name: /add doctor/i }))

    expect(await screen.findByText(/enter a valid email/i)).toBeInTheDocument()
    expect(doctorsService.createDoctor).not.toHaveBeenCalled()
  })
})

describe('EditDoctorModal — Single/CSV toggle', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('shows the Single/CSV toggle only for the standalone create flow (no forcedTenant, not editing)', async () => {
    await mockSession('customer')
    await renderModal(null)

    expect(screen.getByRole('button', { name: /^single$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^csv$/i })).toBeInTheDocument()
  })

  it('hides the toggle in edit mode', async () => {
    await mockSession('customer')
    await renderModal(doctorFixture())

    expect(screen.queryByRole('button', { name: /^single$/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^csv$/i })).not.toBeInTheDocument()
  })

  it('hides the toggle for forcedTenant callers (BookCampForm/CampDetailPageReal inline usage)', async () => {
    await mockSession('customer')
    await renderModalWithCaller({ forcedTenant: { id: 't-forced', label: 'Forced Co' } })

    expect(screen.queryByRole('button', { name: /^single$/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^csv$/i })).not.toBeInTheDocument()
  })

  it('switches to CSV mode and calls bulkCreateDoctors with the chosen file on Import, without a Company for a customer session', async () => {
    await mockSession('customer')
    const { doctorsService } = await import('@/features/doctors/doctors.service')
    const user = userEvent.setup()
    await renderModal(null)

    await user.click(screen.getByRole('button', { name: /^csv$/i }))

    const file = new File(['pharmaCode,name\nD1,Dr A'], 'doctors.csv', { type: 'text/csv' })
    const fileInput = document.getElementById('doctor-bulk-csv') as HTMLInputElement
    await user.upload(fileInput, file)

    const importButton = screen.getByRole('button', { name: /import doctors/i })
    expect(importButton).toBeEnabled()
    await user.click(importButton)

    await waitFor(() => expect(doctorsService.bulkCreateDoctors).toHaveBeenCalledTimes(1))
    const payload = vi.mocked(doctorsService.bulkCreateDoctors).mock.calls[0][0]
    expect(payload.file).toBe(file)
    expect(payload.tenant).toBeUndefined()
    expect(payload.division).toBe('div-1')
  })

  it('disables Import in CSV mode until a file is chosen', async () => {
    await mockSession('customer')
    const user = userEvent.setup()
    await renderModal(null)

    await user.click(screen.getByRole('button', { name: /^csv$/i }))

    expect(screen.getByRole('button', { name: /import doctors/i })).toBeDisabled()
  })

  it('disables Import in CSV mode for a platform session until Company AND Division are picked, even with a file chosen', async () => {
    await mockSession('platform')
    const user = userEvent.setup()
    await renderModal(null)

    await user.click(screen.getByRole('button', { name: /^csv$/i }))

    const file = new File(['pharmaCode,name\nD1,Dr A'], 'doctors.csv', { type: 'text/csv' })
    const fileInput = document.getElementById('doctor-bulk-csv') as HTMLInputElement
    await user.upload(fileInput, file)

    expect(screen.getByRole('button', { name: /import doctors/i })).toBeDisabled()

    await user.type(screen.getByPlaceholderText(/search company by name/i), 'Cipla')
    const option = await screen.findByText('Cipla (cipla)')
    await user.click(option)

    // Company alone isn't enough — division is required too.
    expect(screen.getByRole('button', { name: /import doctors/i })).toBeDisabled()

    await waitFor(() => expect(screen.getByText(/division \*/i)).toBeInTheDocument())
    await user.click(comboboxForLabel(/division \*/i))
    await user.click(await screen.findByText('Cardiology'))

    expect(screen.getByRole('button', { name: /import doctors/i })).toBeEnabled()
  })

  it('resets the picked division when the tenant selection changes in CSV mode', async () => {
    await mockSession('platform')
    const user = userEvent.setup()
    await renderModal(null)

    await user.click(screen.getByRole('button', { name: /^csv$/i }))

    await user.type(screen.getByPlaceholderText(/search company by name/i), 'Cipla')
    const option = await screen.findByText('Cipla (cipla)')
    await user.click(option)

    await waitFor(() => expect(screen.getByText(/division \*/i)).toBeInTheDocument())
    await user.click(comboboxForLabel(/division \*/i))
    await user.click(await screen.findByText('Cardiology'))
    expect(screen.getByText('Cardiology')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /clear selected company/i }))
    await user.type(screen.getByPlaceholderText(/search company by name/i), 'Cipla')
    const optionAgain = await screen.findByText('Cipla (cipla)')
    await user.click(optionAgain)

    expect(screen.queryByText('Cardiology')).not.toBeInTheDocument()
  })

  // A schema-invalid row's error is a field-name -> message map, not a
  // { message } object — the summary must surface that detail, not fall back.
  it('renders a per-field validation error object as field: message pairs, not a generic fallback', async () => {
    await mockSession('customer')
    const { doctorsService } = await import('@/features/doctors/doctors.service')
    vi.mocked(doctorsService.bulkCreateDoctors).mockResolvedValue({
      totalRows: 1, validRows: 0, invalidRows: 1, created: 0, failed: 1,
      errors: [{ row: 2, error: { specialization: 'Invalid option: expected one of "cp"|"gp"', mobile: 'Too small: expected string to have >=10 characters' } }],
    })

    const user = userEvent.setup()
    await renderModal(null)

    await user.click(screen.getByRole('button', { name: /^csv$/i }))
    const file = new File(['pharmaCode,name\nD1,Dr A'], 'doctors.csv', { type: 'text/csv' })
    const fileInput = document.getElementById('doctor-bulk-csv') as HTMLInputElement
    await user.upload(fileInput, file)
    await user.click(screen.getByRole('button', { name: /import doctors/i }))

    expect(await screen.findByText(/row 2:.*specialization: invalid option.*mobile: too small/i)).toBeInTheDocument()
    expect(screen.queryByText(/failed to create/i)).not.toBeInTheDocument()
  })

  it('does not call onCreated and does not close the dialog on a successful CSV import', async () => {
    await mockSession('customer')
    const onCreated = vi.fn()
    const onClose = vi.fn()
    const user = userEvent.setup()
    await renderModalWithCaller({ onCreated, onClose })

    await user.click(screen.getByRole('button', { name: /^csv$/i }))
    const file = new File(['pharmaCode,name\nD1,Dr A'], 'doctors.csv', { type: 'text/csv' })
    const fileInput = document.getElementById('doctor-bulk-csv') as HTMLInputElement
    await user.upload(fileInput, file)
    await user.click(screen.getByRole('button', { name: /import doctors/i }))

    await waitFor(() => expect(screen.getByText(/1 of 1 rows imported successfully/i)).toBeInTheDocument())
    expect(onCreated).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })
})

describe('EditDoctorModal — CSV file-picker UX', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  async function openCsvModeAndPick(fileName = 'doctors.csv') {
    await mockSession('customer')
    const user = userEvent.setup()
    await renderModal(null)
    await user.click(screen.getByRole('button', { name: /^csv$/i }))
    const file = new File(['pharmaCode,name\nD1,Dr A'], fileName, { type: 'text/csv' })
    const fileInput = document.getElementById('doctor-bulk-csv') as HTMLInputElement
    await user.upload(fileInput, file)
    return { user, file, fileInput }
  }

  it('shows a filename + size confirmation after picking a file, and hides the empty dropzone button', async () => {
    const { file } = await openCsvModeAndPick()

    expect(screen.getByText(file.name)).toBeInTheDocument()
    expect(screen.getByText(/\d+ (KB|MB)/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /click to choose a csv file/i })).not.toBeInTheDocument()
  })

  it('the empty-state dropzone is a real, keyboard-focusable button', async () => {
    await mockSession('customer')
    const user = userEvent.setup()
    await renderModal(null)
    await user.click(screen.getByRole('button', { name: /^csv$/i }))

    const dropzone = screen.getByRole('button', { name: /click to choose a csv file/i })
    expect(dropzone.tagName).toBe('BUTTON')
    expect(dropzone).toHaveAttribute('type', 'button')
  })

  it('clicking Remove clears the file, restores the dropzone, and resets bulkCreateDoctors (drops a stale result)', async () => {
    const { doctorsService } = await import('@/features/doctors/doctors.service')
    vi.mocked(doctorsService.bulkCreateDoctors).mockResolvedValue({
      totalRows: 1, validRows: 0, invalidRows: 1, created: 0, failed: 1, errors: [{ row: 1, error: 'boom' }],
    })
    const { user } = await openCsvModeAndPick()
    await user.click(screen.getByRole('button', { name: /import doctors/i }))
    expect(await screen.findByText(/0 of 1 rows imported successfully/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /remove selected file/i }))

    expect(screen.getByRole('button', { name: /click to choose a csv file/i })).toBeInTheDocument()
    expect(screen.queryByText(/rows imported successfully/i)).not.toBeInTheDocument()
  })

  // jsdom fires onChange even for a same-File re-upload unlike real browsers,
  // so the meaningful assertion is the input's OWN .value, not the UI update.
  it('Remove resets the native input value (not just React state), so a real browser would still fire onChange on re-pick', async () => {
    const { user, fileInput } = await openCsvModeAndPick('repick-me.csv')
    expect(fileInput.value).not.toBe('')

    await user.click(screen.getByRole('button', { name: /remove selected file/i }))

    expect(fileInput.value).toBe('')
  })

  it('clicking "Change file" resets the input value before opening it, so re-selecting the exact same file still updates the state', async () => {
    const { user, fileInput } = await openCsvModeAndPick('same-name.csv')
    expect(screen.getByText('same-name.csv')).toBeInTheDocument()
    expect(fileInput.value).not.toBe('')

    await user.click(screen.getByRole('button', { name: /change file/i }))
    // Without this reset, a real browser wouldn't fire onChange for the
    // identical file re-uploaded below.
    expect(fileInput.value).toBe('')

    const sameFileAgain = new File(['pharmaCode,name\nD1,Dr A'], 'same-name.csv', { type: 'text/csv' })
    await user.upload(fileInput, sameFileAgain)

    expect(screen.getByText('same-name.csv')).toBeInTheDocument()
  })

  it('keeps the hidden file input mounted while a file is selected, so a replacement can be uploaded through it directly', async () => {
    const { fileInput } = await openCsvModeAndPick('first.csv')
    expect(screen.getByText('first.csv')).toBeInTheDocument()

    const user = userEvent.setup()
    const replacement = new File(['pharmaCode,name\nD2,Dr B'], 'second.csv', { type: 'text/csv' })
    await user.upload(fileInput, replacement)

    expect(screen.getByText('second.csv')).toBeInTheDocument()
  })

  it('clears the file automatically after a clean success (failed === 0), leaving the result summary visible', async () => {
    const { doctorsService } = await import('@/features/doctors/doctors.service')
    vi.mocked(doctorsService.bulkCreateDoctors).mockResolvedValue({
      totalRows: 1, validRows: 1, invalidRows: 0, created: 1, failed: 0, errors: [],
    })
    const { user } = await openCsvModeAndPick()
    await user.click(screen.getByRole('button', { name: /import doctors/i }))

    await waitFor(() => expect(screen.getByRole('button', { name: /click to choose a csv file/i })).toBeInTheDocument())
    expect(screen.getByText(/1 of 1 rows imported successfully/i)).toBeInTheDocument()
  })

  it('does NOT clear the file after a partial-failure result (failed > 0)', async () => {
    const { doctorsService } = await import('@/features/doctors/doctors.service')
    vi.mocked(doctorsService.bulkCreateDoctors).mockResolvedValue({
      totalRows: 2, validRows: 1, invalidRows: 1, created: 1, failed: 1, errors: [{ row: 2, error: 'boom' }],
    })
    const { user, file } = await openCsvModeAndPick()
    await user.click(screen.getByRole('button', { name: /import doctors/i }))

    await waitFor(() => expect(screen.getByText(/1 of 2 rows imported successfully/i)).toBeInTheDocument())
    expect(screen.getByText(file.name)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /click to choose a csv file/i })).not.toBeInTheDocument()
  })

  // failed === 0 alone is NOT "clean" — invalidRows > 0 means some rows never
  // reached the DB-layer create step at all, and must not read as full success.
  it('does NOT clear the file, and does not show a success icon, when invalidRows > 0 even though failed === 0', async () => {
    const { doctorsService } = await import('@/features/doctors/doctors.service')
    vi.mocked(doctorsService.bulkCreateDoctors).mockResolvedValue({
      totalRows: 2, validRows: 1, invalidRows: 1, created: 1, failed: 0, errors: [{ row: 2, error: 'Invalid option' }],
    })
    const { user, file } = await openCsvModeAndPick()
    await user.click(screen.getByRole('button', { name: /import doctors/i }))

    await waitFor(() => expect(screen.getByText(/1 of 2 rows imported successfully/i)).toBeInTheDocument())
    expect(screen.getByText(file.name)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /click to choose a csv file/i })).not.toBeInTheDocument()
    expect(screen.getByText(/1 row skipped for invalid\/missing data/i)).toBeInTheDocument()
  })
})

describe('EditDoctorModal — partial update payload', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('saving without touching any field omits name/location/mobile — never resends a stale snapshot to clobber a concurrent edit', async () => {
    await mockSession('customer')
    const { doctorsService } = await import('@/features/doctors/doctors.service')
    const user = userEvent.setup()
    await renderModal(doctorFixture({ name: 'STALE-NAME', mobile: '9000000000' }))

    await user.click(screen.getByRole('button', { name: /save changes/i }))

    const payload = await waitFor(() => {
      const call = vi.mocked(doctorsService.updateDoctor).mock.calls[0]
      if (!call) throw new Error('not called yet')
      return call[1]
    })
    expect(payload).not.toHaveProperty('name')
    expect(payload).not.toHaveProperty('location')
    expect(payload).not.toHaveProperty('mobile')
  })

  it('editing doctor name directly includes only name in the payload', async () => {
    await mockSession('customer')
    const { doctorsService } = await import('@/features/doctors/doctors.service')
    const user = userEvent.setup()
    await renderModal(doctorFixture({ name: 'Dr. Old Name' }))

    const nameInput = inputForLabel(/doctor name/i)
    await user.clear(nameInput)
    await user.type(nameInput, 'Dr. New Name')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    const payload = await waitFor(() => {
      const call = vi.mocked(doctorsService.updateDoctor).mock.calls[0]
      if (!call) throw new Error('not called yet')
      return call[1]
    })
    expect(payload.name).toBe('Dr. New Name')
    expect(payload).not.toHaveProperty('location')
  })

  // A legacy doctor with no location must still be editable for every other
  // field, without being forced through the create-mode completeness check.
  it('a legacy doctor with location: null can still save an unrelated field edit, with location omitted', async () => {
    await mockSession('customer')
    const { doctorsService } = await import('@/features/doctors/doctors.service')
    const user = userEvent.setup()
    await renderModal(doctorFixture({ name: 'Dr. Old Name', location: null }))

    const nameInput = inputForLabel(/doctor name/i)
    await user.clear(nameInput)
    await user.type(nameInput, 'Dr. New Name')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    const payload = await waitFor(() => {
      const call = vi.mocked(doctorsService.updateDoctor).mock.calls[0]
      if (!call) throw new Error('not called yet')
      return call[1]
    })
    expect(payload.name).toBe('Dr. New Name')
    expect(payload).not.toHaveProperty('location')
  })

  // Changing the location must send the FULL object (wholesale replace, no partial
  // location update), and must leave the untouched name out of the payload.
  it('changing the location includes the complete location object, leaving the untouched name out', async () => {
    await mockSession('customer')
    const { doctorsService } = await import('@/features/doctors/doctors.service')
    const user = userEvent.setup()
    await renderModal(doctorFixture({ name: 'STALE-NAME', location: null }))

    await user.click(screen.getByRole('button', { name: /set test coordinates/i }))
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    const payload = await waitFor(() => {
      const call = vi.mocked(doctorsService.updateDoctor).mock.calls[0]
      if (!call) throw new Error('not called yet')
      return call[1]
    })
    expect(payload.location).toMatchObject({ city: 'Test City', state: 'Test State', pincode: '110001' })
    expect(payload).not.toHaveProperty('name')
  })

  it('blocks save while the location is still resolving, without calling updateDoctor', async () => {
    await mockSession('customer')
    const { doctorsService } = await import('@/features/doctors/doctors.service')
    const user = userEvent.setup()
    await renderModal(doctorFixture({ name: 'STALE-NAME' }))

    await user.click(screen.getByRole('button', { name: /simulate location resolving/i }))
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    expect(await screen.findByText(/still resolving the picked location/i)).toBeInTheDocument()
    expect(doctorsService.updateDoctor).not.toHaveBeenCalled()
  })

  it('blocks save while the location resolution errored, without calling updateDoctor', async () => {
    await mockSession('customer')
    const { doctorsService } = await import('@/features/doctors/doctors.service')
    const user = userEvent.setup()
    await renderModal(doctorFixture({ name: 'STALE-NAME' }))

    await user.click(screen.getByRole('button', { name: /simulate location error/i }))
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    expect(await screen.findByText(/retry, or choose "use this pin,"/i)).toBeInTheDocument()
    expect(doctorsService.updateDoctor).not.toHaveBeenCalled()
  })

  // Dirty-gating must compare the FINAL value to the original snapshot, not
  // "was the field ever touched" — editing then reverting is a no-op.
  it('editing a field then reverting it to its exact original value omits it from the payload', async () => {
    await mockSession('customer')
    const { doctorsService } = await import('@/features/doctors/doctors.service')
    const user = userEvent.setup()
    await renderModal(doctorFixture({ name: 'ORIGINAL-NAME' }))

    const nameInput = inputForLabel(/doctor name/i)
    await user.clear(nameInput)
    await user.type(nameInput, 'TEMP-NAME')
    await user.clear(nameInput)
    await user.type(nameInput, 'ORIGINAL-NAME')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    const payload = await waitFor(() => {
      const call = vi.mocked(doctorsService.updateDoctor).mock.calls[0]
      if (!call) throw new Error('not called yet')
      return call[1]
    })
    expect(payload).not.toHaveProperty('name')
    expect(payload).not.toHaveProperty('location')
  })
})
