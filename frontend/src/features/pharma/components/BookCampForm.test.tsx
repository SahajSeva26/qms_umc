import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { format } from 'date-fns'
import type { RoleEntity, SessionResponse } from '@/types/accessManagement.types'
import type { DoctorEntity } from '@/types/doctor.types'
import type { ApiResponse } from '@/types/common.types'
import type { CampMutationResponseEntity } from '@/types/campReal.types'
import type { CampTimeSlotValue } from '@/types/campTimeSlot.constants'

vi.mock('@/hooks/useSession')

// Mocks the map (needs real Google Maps creds) with buttons firing the same onChange/onResolutionStateChange contract.
vi.mock('@/components/widgets/location-picker/LocationPicker', () => ({
  default: ({ value, onChange, onResolutionStateChange }: {
    value: unknown
    onChange: (v: unknown) => void
    onResolutionStateChange?: (status: 'idle' | 'loading' | 'error') => void
  }) => (
    <>
      <button
        type="button"
        onClick={() => onChange({ ...(value as object ?? {}), coordinates: [73.8567, 18.5204] })}
      >
        Set test coordinates
      </button>
      {/* Simulates the real widget's "pin moved / search result picked, still
          resolving" window — the gap between a pick and onChange actually firing. */}
      <button type="button" onClick={() => onResolutionStateChange?.('loading')}>
        Simulate location resolving
      </button>
      <button type="button" onClick={() => onResolutionStateChange?.('idle')}>
        Simulate location resolved
      </button>
    </>
  ),
}))

vi.mock('@/features/access-management/accessManagement.service', () => ({
  accessManagementService: {
    searchDownlineMrs: vi.fn(async () => ({ success: true, message: '', data: { items: [], count: 0 } })),
  },
}))

vi.mock('@/features/doctors/doctors.service', () => ({
  doctorsService: {
    searchDoctors: vi.fn(async () => ({ success: true, message: '', data: { items: [], count: 0 } })),
    createDoctor: vi.fn(),
    updateDoctor: vi.fn(),
  },
}))

const startOfToday = () => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}
const TODAY_KEY = format(startOfToday(), 'yyyy-MM-dd')

vi.mock('@/features/camps/campsReal.service', () => ({
  campsRealService: {
    bookCamp: vi.fn(async () => ({ success: true, message: '', data: { id: 'camp-1', code: 'cmp-000001' } })),
    getBookingAvailability: vi.fn(async () => ({
      success: true,
      message: '',
      data: {
        eligibleFoCount: 1,
        dateFrom: TODAY_KEY,
        dateTo: TODAY_KEY,
        dates: {
          [TODAY_KEY]: {
            available: true,
            slots: { '9am-1pm': true, '10am-2pm': true, '11am-3pm': true, '6pm-10pm': true },
          },
        },
      },
    })),
  },
}))

function sessionFixture(roleId = 'self-role-1'): SessionResponse {
  return {
    user: { id: 'u-1', email: 'a@example.com', firstName: 'a', lastName: 'b' },
    role: { id: roleId, code: 'pharma-mr', name: 'MR', division: 'div-1' },
    roleType: { id: 'rt-1', code: 'pharma-mr', name: 'pharma-mr' },
    tenant: { id: 't-1', code: 'tenant-1', name: 'Tenant', type: 'customer' },
    permissions: ['camp:book'],
  } as unknown as SessionResponse
}

function mrFixture(overrides: Partial<RoleEntity> = {}): RoleEntity {
  return { id: 'mr-1', code: 'phr-000001', name: 'Cardio MR Mona', permissions: [], status: 'active', type: 'rt-mr', user: 'u-1', tenant: 't-1', createdAt: '', updatedAt: '', ...overrides } as RoleEntity
}

function doctorFixture(overrides: Partial<DoctorEntity> = {}): DoctorEntity {
  return {
    id: 'doc-1', pharmaCode: 'DOC-1', name: 'Dr. Priya Sharma', specialization: 'cp', mobile: '9876543210', email: 'p@example.com',
    location: { addressLine1: '221 Baker Street', city: 'Pune', state: 'Maharashtra', pincode: '411001', coordinates: [73.8567, 18.5204] },
    division: 'div-1', createdAt: '', updatedAt: '', ...overrides,
  } as DoctorEntity
}

function bookCampResponseFixture(overrides: Partial<CampMutationResponseEntity> = {}): ApiResponse<CampMutationResponseEntity> {
  return {
    success: true,
    message: '',
    data: {
      id: 'camp-1', code: 'cmp-000001', tenant: 't-1', division: 'div-1', project: null,
      doctor: 'doc-1', type: 'screening', billingType: 'billable', patientExpectation: 0,
      fo: null, mr: null, date: TODAY_KEY,
      timeSlot: '9am-1pm',
      location: {
        addressLine1: '221 Baker Street', city: 'Pune', state: 'Maharashtra',
        pincode: '411001', coordinates: [73.8567, 18.5204],
      },
      devices: [], status: 'requested', stageHistory: [],
      createdAt: '', updatedAt: '', ...overrides,
    },
  } as ApiResponse<CampMutationResponseEntity>
}

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

const TEST_PROJECT: { id: string; name: string; campTimeSlots: CampTimeSlotValue[] } = { id: 'proj-1', name: 'Cardio Screening Drive', campTimeSlots: ['9am-1pm', '10am-2pm'] }

async function mockSession(roleId?: string, hasDoctorManage = false) {
  const { useSession } = await import('@/hooks/useSession')
  vi.mocked(useSession).mockReturnValue({
    session: sessionFixture(roleId),
    // usePermission() (used for the dormant "New doctor" gate) wraps
    // useSession() directly — hasPermission must be present on the mock.
    hasPermission: (code: string) => (code === 'doctor:manage' ? hasDoctorManage : false),
  } as unknown as ReturnType<typeof useSession>)
}

function renderForm(props: { needsMrPicker?: boolean; type?: 'screening' | 'diet' } = {}) {
  return async () => {
    const BookCampForm = (await import('@/features/pharma/components/BookCampForm')).default
    const onBooked = vi.fn()
    const onCancel = vi.fn()
    render(
      <QueryClientProvider client={makeQueryClient()}>
        <BookCampForm needsMrPicker={props.needsMrPicker ?? false} type={props.type ?? 'screening'} project={TEST_PROJECT} onBooked={onBooked} onCancel={onCancel} />
      </QueryClientProvider>,
    )
    return { onBooked, onCancel }
  }
}

async function pickDoctor(user: ReturnType<typeof userEvent.setup>) {
  const { doctorsService } = await import('@/features/doctors/doctors.service')
  vi.mocked(doctorsService.searchDoctors).mockResolvedValue({
    success: true, message: '', data: { items: [doctorFixture()], count: 1 },
  })
  await user.type(screen.getByPlaceholderText(/search doctor by name/i), 'Priya')
  const option = await screen.findByText(/Dr\. Priya Sharma/i, {}, { timeout: 3000 })
  await user.click(option)
}

async function pickMr(user: ReturnType<typeof userEvent.setup>) {
  const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
  vi.mocked(accessManagementService.searchDownlineMrs).mockResolvedValue({
    success: true, message: '', data: { items: [mrFixture()], count: 1 },
  })
  await user.type(screen.getByPlaceholderText(/search mr by name/i), 'mo')
  const option = await screen.findByText(/Cardio MR Mona/i, {}, { timeout: 3000 })
  await user.click(option)
}

// Step 1 -> step 2, filling only what's required for that step.
async function completeStep1(user: ReturnType<typeof userEvent.setup>, { withMr = false } = {}) {
  if (withMr) await pickMr(user)
  await pickDoctor(user)
  await user.click(screen.getByRole('button', { name: /^next$/i }))
}

// Fills EditDoctorModal's own Location card (required on create) — same real
// LocationAddressFields inputs as Camp's own step 2, scoped to the open dialog.
async function fillNewDoctorLocation(user: ReturnType<typeof userEvent.setup>) {
  const dialog = screen.getByRole('dialog')
  await user.type(within(dialog).getByLabelText(/^address line 1$/i), '221 Baker Street')
  await user.type(within(dialog).getByLabelText(/^city$/i), 'Pune')
  await user.type(within(dialog).getByLabelText(/^state$/i), 'Maharashtra')
  await user.type(within(dialog).getByLabelText(/^pincode$/i), '411001')
  await user.click(within(dialog).getByRole('button', { name: /set test coordinates/i }))
}

// Step 2 -> step 3, filling location and resolving coordinates.
async function completeStep2(user: ReturnType<typeof userEvent.setup>) {
  await user.type(await screen.findByLabelText(/^address line 1$/i), '221 Baker Street')
  await user.type(screen.getByLabelText(/^city$/i), 'Pune')
  await user.type(screen.getByLabelText(/^state$/i), 'Maharashtra')
  await user.type(screen.getByLabelText(/^pincode$/i), '411001')
  await user.click(screen.getByRole('button', { name: /set test coordinates/i }))
  await user.click(screen.getByRole('button', { name: /^next$/i }))
}

// Step 3: pick today's date (the only mocked-available day) then its first slot.
async function pickDateAndSlot(user: ReturnType<typeof userEvent.setup>) {
  const todayCell = await screen.findByRole('gridcell', { name: String(startOfToday().getDate()) })
  const todayBtn = todayCell.querySelector('button')!
  await user.click(todayBtn)
  const slotPill = await screen.findByRole('button', { name: /9 AM – 1 PM/i })
  await user.click(slotPill)
}

// Full happy-path flow through all 3 steps up to (not including) the final submit click.
async function fillWholeForm(user: ReturnType<typeof userEvent.setup>, opts: { withMr?: boolean } = {}) {
  await completeStep1(user, { withMr: opts.withMr })
  await completeStep2(user)
  await pickDateAndSlot(user)
}

describe('BookCampForm — step 1 (who)', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('clicking Next with no doctor selected shows the error and does not advance', async () => {
    await mockSession()
    const user = userEvent.setup()
    await renderForm()()

    await user.click(screen.getByRole('button', { name: /^next$/i }))

    expect(await screen.findByText(/doctor is required/i)).toBeInTheDocument()
    // Still on step 1 — Location isn't rendered yet.
    expect(screen.queryByLabelText(/^address line 1$/i)).not.toBeInTheDocument()
  })

  it('clicking Cancel calls onCancel and never submits or fetches', async () => {
    await mockSession()
    const user = userEvent.setup()
    const { onCancel } = await renderForm()()

    await user.click(screen.getByRole('button', { name: /^cancel$/i }))
    expect(onCancel).toHaveBeenCalledTimes(1)

    const { campsRealService } = await import('@/features/camps/campsReal.service')
    expect(campsRealService.bookCamp).not.toHaveBeenCalled()
  })

  it('when missingSelfMrId is true, clicking Next does not advance to step 2', async () => {
    // No needsMrPicker and no resolvable session role id.
    const { useSession } = await import('@/hooks/useSession')
    vi.mocked(useSession).mockReturnValue({
      session: { ...sessionFixture(), role: { id: '', code: 'pharma-mr', name: 'MR' } },
      hasPermission: () => false,
    } as unknown as ReturnType<typeof useSession>)
    const user = userEvent.setup()
    await renderForm()()

    await pickDoctor(user)
    await user.click(screen.getByRole('button', { name: /^next$/i }))

    expect(screen.queryByLabelText(/^address line 1$/i)).not.toBeInTheDocument()
  })

  it('blocks Next with no MR selected when needsMrPicker is true', async () => {
    await mockSession()
    const user = userEvent.setup()
    await renderForm({ needsMrPicker: true })()

    await pickDoctor(user)
    await user.click(screen.getByRole('button', { name: /^next$/i }))

    expect(await screen.findByText(/mr is required/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/^address line 1$/i)).not.toBeInTheDocument()
  })
})

describe('BookCampForm — step 2 (where)', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('clicking Next with an incomplete address shows its errors and does not advance', async () => {
    await mockSession()
    const user = userEvent.setup()
    await renderForm()()

    await completeStep1(user)
    // Only address line 1 + city filled — state/pincode left blank.
    await user.type(screen.getByLabelText(/^address line 1$/i), '221 Baker Street')
    await user.type(screen.getByLabelText(/^city$/i), 'Pune')
    await user.click(screen.getByRole('button', { name: /set test coordinates/i }))
    await user.click(screen.getByRole('button', { name: /^next$/i }))

    const stateSpan = await screen.findByText('State is required.')
    const pincodeSpan = await screen.findByText('Pincode is required.')
    expect(stateSpan.tagName).toBe('SPAN')
    expect(pincodeSpan.tagName).toBe('SPAN')
    // Still on step 2 — the calendar hasn't rendered.
    expect(screen.queryByRole('gridcell')).not.toBeInTheDocument()
  })

  it('clicking Next while location is resolving is blocked with the resolving message, then clears once resolved', async () => {
    await mockSession()
    const user = userEvent.setup()
    await renderForm()()

    await completeStep1(user)
    await user.type(screen.getByLabelText(/^address line 1$/i), '221 Baker Street')
    await user.type(screen.getByLabelText(/^city$/i), 'Pune')
    await user.type(screen.getByLabelText(/^state$/i), 'Maharashtra')
    await user.type(screen.getByLabelText(/^pincode$/i), '411001')
    await user.click(screen.getByRole('button', { name: /set test coordinates/i }))
    await user.click(screen.getByRole('button', { name: /simulate location resolving/i }))

    await user.click(screen.getByRole('button', { name: /^next$/i }))
    expect(await screen.findByText(/still resolving the picked location/i)).toBeInTheDocument()
    expect(screen.queryByRole('gridcell')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /simulate location resolved/i }))
    await user.click(screen.getByRole('button', { name: /^next$/i }))

    // Stale error is gone, and we've genuinely advanced to step 3.
    expect(screen.queryByText(/still resolving the picked location/i)).not.toBeInTheDocument()
    expect(await screen.findAllByRole('gridcell')).not.toHaveLength(0)
  })

  it('Back returns to step 1 without losing the doctor already picked', async () => {
    await mockSession()
    const user = userEvent.setup()
    await renderForm()()

    await completeStep1(user)
    await user.click(screen.getByRole('button', { name: /^back$/i }))

    // A selected doctor renders as a plain label span, not an input.
    expect(screen.getByText(/Dr\. Priya Sharma/i)).toBeInTheDocument()
  })

  it('a step-3 field error is never shown just because step 1/2 Next was attempted', async () => {
    await mockSession()
    const user = userEvent.setup()
    await renderForm()()

    await completeStep1(user)
    // Address filled but city/state/pincode blank — Next fails validation, stays on step 2.
    await user.type(screen.getByLabelText(/^address line 1$/i), '221 Baker Street')
    await user.click(screen.getByRole('button', { name: /set test coordinates/i }))
    await user.click(screen.getByRole('button', { name: /^next$/i }))
    await screen.findByText(/city is required/i)

    // No step-3-only text ("Date is required"/"Time slot is required") should appear.
    expect(screen.queryByText(/date is required/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/time slot is required/i)).not.toBeInTheDocument()
  })
})

describe('BookCampForm — step 3 (when & details) and submit', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('the calendar shows a project-filtered slot row once a bookable date is picked, not all 4 slots', async () => {
    await mockSession()
    const user = userEvent.setup()
    await renderForm()()

    await completeStep1(user)
    await completeStep2(user)

    const todayCell = await screen.findByRole('gridcell', { name: String(startOfToday().getDate()) })
    await user.click(todayCell.querySelector('button')!)

    expect(await screen.findByRole('button', { name: /9 AM – 1 PM/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /10 AM – 2 PM/i })).toBeInTheDocument()
    expect(screen.queryByText(/11 AM – 3 PM/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/6 PM – 10 PM/i)).not.toBeInTheDocument()
  })

  it('selecting a date, then navigating to a different month, clears the picked date and slot', async () => {
    await mockSession()
    const user = userEvent.setup()
    await renderForm()()

    await completeStep1(user)
    await completeStep2(user)
    await pickDateAndSlot(user)

    // Navigate forward a month via the dropdown-free chevron nav react-day-picker renders.
    await user.click(screen.getByRole('button', { name: /next month/i }))

    // The slot row (which only renders once selectedDate is truthy) should be gone.
    expect(screen.queryByRole('button', { name: /9 AM – 1 PM/i })).not.toBeInTheDocument()
  })

  it('submits the session\'s own role id as mr when needsMrPicker is false', async () => {
    await mockSession('self-role-42')
    const { campsRealService } = await import('@/features/camps/campsReal.service')
    const user = userEvent.setup()
    await renderForm()()

    await fillWholeForm(user)
    await user.click(screen.getByRole('button', { name: /book camp/i }))

    await waitFor(() => expect(campsRealService.bookCamp).toHaveBeenCalledTimes(1))
    const payload = vi.mocked(campsRealService.bookCamp).mock.calls[0][0]
    expect(payload.mr).toBe('self-role-42')
    expect(payload.doctor).toBe('doc-1')
    expect(payload.date).toBe(TODAY_KEY)
    expect(payload.timeSlot).toBe('9am-1pm')
    expect(payload.location).toEqual(expect.objectContaining({
      addressLine1: '221 Baker Street', city: 'Pune', state: 'Maharashtra',
      pincode: '411001', coordinates: [73.8567, 18.5204],
    }))
    expect(payload).not.toHaveProperty('city')
    expect(payload).not.toHaveProperty('state')
    expect(payload).not.toHaveProperty('coordinates')
    expect(payload.project).toBe(TEST_PROJECT.id)
    expect(screen.getByText(TEST_PROJECT.name)).toBeInTheDocument()
  })

  it('submits the MR field when needsMrPicker is true and an MR is selected', async () => {
    await mockSession()
    const { campsRealService } = await import('@/features/camps/campsReal.service')
    const user = userEvent.setup()
    await renderForm({ needsMrPicker: true })()

    await fillWholeForm(user, { withMr: true })
    await user.click(screen.getByRole('button', { name: /book camp/i }))

    await waitFor(() => expect(campsRealService.bookCamp).toHaveBeenCalledTimes(1))
    expect(vi.mocked(campsRealService.bookCamp).mock.calls[0][0].mr).toBe('mr-1')
  })

  it('submits patientExpectation as omitted when left blank, but preserves a genuine 0', async () => {
    await mockSession()
    const { campsRealService } = await import('@/features/camps/campsReal.service')
    const user = userEvent.setup()
    await renderForm()()

    await fillWholeForm(user)
    await user.click(screen.getByRole('button', { name: /book camp/i }))

    await waitFor(() => expect(campsRealService.bookCamp).toHaveBeenCalledTimes(1))
    expect(vi.mocked(campsRealService.bookCamp).mock.calls[0][0].patientExpectation).toBeUndefined()
  })

  it('preserves patientExpectation: 0 rather than treating it as blank', async () => {
    await mockSession()
    const { campsRealService } = await import('@/features/camps/campsReal.service')
    const user = userEvent.setup()
    await renderForm()()

    await fillWholeForm(user)
    await user.type(screen.getByLabelText(/patients expected/i), '0')
    await user.click(screen.getByRole('button', { name: /book camp/i }))

    await waitFor(() => expect(campsRealService.bookCamp).toHaveBeenCalledTimes(1))
    expect(vi.mocked(campsRealService.bookCamp).mock.calls[0][0].patientExpectation).toBe(0)
  })

  it('calls onBooked with the created camp on success, and resets the form back to step 1', async () => {
    await mockSession()
    const user = userEvent.setup()
    const { onBooked } = await renderForm()()

    await fillWholeForm(user)
    await user.click(screen.getByRole('button', { name: /book camp/i }))

    await waitFor(() => expect(onBooked).toHaveBeenCalledTimes(1))
    expect(onBooked.mock.calls[0][0].data.code).toBe('cmp-000001')
    expect(screen.queryByText(/camp requested/i)).not.toBeInTheDocument()
    // Reset lands back on step 1 — Doctor field is visible again, empty.
    expect(screen.getByPlaceholderText(/search doctor by name/i)).toBeInTheDocument()
  })

  it('Cancel/Back never submit the form as a side effect (type="button" regression)', async () => {
    await mockSession()
    const { campsRealService } = await import('@/features/camps/campsReal.service')
    const user = userEvent.setup()
    await renderForm()()

    await completeStep1(user)
    await user.click(screen.getByRole('button', { name: /^back$/i }))
    expect(campsRealService.bookCamp).not.toHaveBeenCalled()

    // Re-advance (doctor is already picked, Next just re-validates) and go
    // all the way to step 3, then Back from there too.
    await user.click(screen.getByRole('button', { name: /^next$/i }))
    await completeStep2(user)
    await user.click(screen.getByRole('button', { name: /^back$/i }))
    expect(campsRealService.bookCamp).not.toHaveBeenCalled()
  })

  it('disables the submit button while a booking is in flight, preventing a duplicate submit', async () => {
    await mockSession()
    const { campsRealService } = await import('@/features/camps/campsReal.service')
    let resolveBooking: (value: ApiResponse<CampMutationResponseEntity>) => void = () => {}
    vi.mocked(campsRealService.bookCamp).mockImplementation(
      () => new Promise((resolve) => { resolveBooking = resolve }),
    )
    const user = userEvent.setup()
    const { onBooked } = await renderForm()()

    await fillWholeForm(user)
    const submitButton = screen.getByRole('button', { name: /book camp/i })
    await user.click(submitButton)

    await waitFor(() => expect(submitButton).toBeDisabled())
    await user.click(submitButton)
    expect(campsRealService.bookCamp).toHaveBeenCalledTimes(1)

    resolveBooking(bookCampResponseFixture())
    await waitFor(() => expect(onBooked).toHaveBeenCalledTimes(1))
  })

  // The "blocks submit while location resolving" case is covered by the step-2 test above — LocationPicker isn't mounted on step 3.

  it('blocks a true rapid double-submit to exactly one mutation call', async () => {
    await mockSession()
    const { campsRealService } = await import('@/features/camps/campsReal.service')
    let resolveBooking: (value: ApiResponse<CampMutationResponseEntity>) => void = () => {}
    vi.mocked(campsRealService.bookCamp).mockImplementation(
      () => new Promise((resolve) => { resolveBooking = resolve }),
    )
    const user = userEvent.setup()
    const { onBooked } = await renderForm()()

    await fillWholeForm(user)
    const form = screen.getByRole('button', { name: /book camp/i }).closest('form')
    if (!form) throw new Error('form not found')

    fireEvent.submit(form)
    fireEvent.submit(form)

    await waitFor(() => expect(campsRealService.bookCamp).toHaveBeenCalled())
    expect(campsRealService.bookCamp).toHaveBeenCalledTimes(1)

    resolveBooking(bookCampResponseFixture())
    await waitFor(() => expect(onBooked).toHaveBeenCalledTimes(1))
  })
})

describe('BookCampForm — zero configured slots', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('blocks booking and shows a clear message when the project has zero configured slots', async () => {
    await mockSession()
    const BookCampForm = (await import('@/features/pharma/components/BookCampForm')).default

    render(
      <QueryClientProvider client={makeQueryClient()}>
        <BookCampForm needsMrPicker={false} type="screening" project={{ id: 'proj-2', name: 'Empty Project', campTimeSlots: [] }} onBooked={vi.fn()} onCancel={vi.fn()} />
      </QueryClientProvider>,
    )

    expect(screen.getByText(/no configured time slots/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /book camp/i })).not.toBeInTheDocument()
  })
})

describe('BookCampForm — inline doctor creation (dormant until doctor:manage is granted)', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('hides the "New doctor" trigger without doctor:manage — the real state for every pharma role today', async () => {
    await mockSession(undefined, false)
    await renderForm()()

    expect(screen.queryByRole('button', { name: /new doctor/i })).not.toBeInTheDocument()
  })

  it('creating a doctor auto-selects it via the same field.onChange/doctorLabel pipe as a normal search pick', async () => {
    await mockSession('self-role-42', true)
    const { doctorsService } = await import('@/features/doctors/doctors.service')
    vi.mocked(doctorsService.createDoctor).mockResolvedValue({
      success: true, message: '',
      data: { id: 'doc-new', pharmaCode: 'DOC-NEW', name: 'Dr. New', specialization: 'cp', mobile: '', email: '', location: null, division: 'div-1', createdAt: '', updatedAt: '', tenant: 't-1' },
    })
    const user = userEvent.setup()
    await renderForm()()

    await user.click(screen.getByRole('button', { name: /new doctor/i }))
    await screen.findByRole('dialog')
    expect(screen.getByText(/locked to the camp being booked/i)).toBeInTheDocument()

    const codeLabel = screen.getByText(/pharma doctor code/i)
    await user.type(codeLabel.parentElement!.querySelector('input')!, 'DOC-NEW')
    const nameLabel = screen.getByText(/^doctor name$/i)
    await user.type(nameLabel.parentElement!.querySelector('input')!, 'Dr. New')
    const mobileLabel = screen.getByText(/^mobile$/i)
    await user.type(mobileLabel.parentElement!.querySelector('input')!, '9876543210')
    const emailLabel = screen.getByText(/^email$/i)
    await user.type(emailLabel.parentElement!.querySelector('input')!, 'newdoc@example.com')
    await fillNewDoctorLocation(user)
    await user.click(screen.getByRole('button', { name: /^add doctor$/i }))

    await waitFor(() => expect(doctorsService.createDoctor).toHaveBeenCalledTimes(1))
    expect(vi.mocked(doctorsService.createDoctor).mock.calls[0][0].tenant).toBe('t-1')

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByText(/dr\. new \(doc-new\)/i)).toBeInTheDocument()
  })

  it('clears a stale "Doctor is required" error once a doctor is created inline', async () => {
    await mockSession('self-role-42', true)
    const { doctorsService } = await import('@/features/doctors/doctors.service')
    vi.mocked(doctorsService.createDoctor).mockResolvedValue({
      success: true, message: '',
      data: { id: 'doc-new', pharmaCode: 'DOC-NEW', name: 'Dr. New', specialization: 'cp', mobile: '', email: '', location: null, division: 'div-1', createdAt: '', updatedAt: '', tenant: 't-1' },
    })
    const user = userEvent.setup()
    await renderForm()()

    await user.click(screen.getByRole('button', { name: /^next$/i }))
    await waitFor(() => expect(screen.getByText(/doctor is required/i)).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: /new doctor/i }))
    await screen.findByRole('dialog')
    const codeLabel = screen.getByText(/pharma doctor code/i)
    await user.type(codeLabel.parentElement!.querySelector('input')!, 'DOC-NEW')
    const nameLabel = screen.getByText(/^doctor name$/i)
    await user.type(nameLabel.parentElement!.querySelector('input')!, 'Dr. New')
    const mobileLabel = screen.getByText(/^mobile$/i)
    await user.type(mobileLabel.parentElement!.querySelector('input')!, '9876543210')
    const emailLabel = screen.getByText(/^email$/i)
    await user.type(emailLabel.parentElement!.querySelector('input')!, 'newdoc@example.com')
    await fillNewDoctorLocation(user)
    await user.click(screen.getByRole('button', { name: /^add doctor$/i }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.queryByText(/doctor is required/i)).not.toBeInTheDocument()
  })

  it('Cancel creates no doctor', async () => {
    await mockSession(undefined, true)
    const { doctorsService } = await import('@/features/doctors/doctors.service')
    const user = userEvent.setup()
    await renderForm()()

    await user.click(screen.getByRole('button', { name: /new doctor/i }))
    await screen.findByRole('dialog')
    await user.click(screen.getByRole('button', { name: /^cancel$/i }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(doctorsService.createDoctor).not.toHaveBeenCalled()
  })
})
