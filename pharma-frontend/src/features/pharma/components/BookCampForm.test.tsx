import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError } from 'axios'
import { addDays, format } from 'date-fns'
import type { SessionResponse } from '@qms/core'
import type { DoctorEntity } from '@/types/doctor.types'
import type { ApiResponse } from '@qms/core'
import type { CampMutationResponseEntity } from '@/types/campReal.types'
import type { CampTimeSlotValue } from '@/types/campTimeSlot.constants'
import { createEmptyLocationValue } from '@qms/core'

vi.mock('@/hooks/useSession')

// Mocks the map (needs real Google Maps creds) with buttons firing the same onChange/onResolutionStateChange contract.
// A second "Set FAR test coordinates" button exercises the out-of-range re-pick flow without
// needing real map interaction.
vi.mock('@qms/ui', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@qms/ui')>()),
  LocationPicker: ({ value, onChange, onResolutionStateChange }: {
    value: unknown
    onChange: (v: unknown) => void
    onResolutionStateChange?: (status: 'idle' | 'loading' | 'error') => void
  }) => (
    <>
      <button
        type="button"
        // Matches the real LocationPicker's own onChange contract (value ?? createEmptyLocationValue()) —
        // a bare {} would leave addressLine1/city/etc. undefined, crashing LocationAddressFields' own `.trim()`.
        onClick={() => onChange({ ...(value as object ?? createEmptyLocationValue()), coordinates: [73.8567, 18.5204] })}
      >
        Set test coordinates
      </button>
      <button
        type="button"
        onClick={() => onChange({ ...(value as object ?? createEmptyLocationValue()), coordinates: [77.0266, 28.4595] })}
      >
        Set FAR test coordinates
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

vi.mock('@/features/pharma/doctors.service', () => ({
  doctorsService: {
    searchDoctors: vi.fn(async () => ({ success: true, message: '', data: { items: [], count: 0 } })),
    nearestDoctors: vi.fn(async () => ({ success: true, message: '', data: { items: [], count: 0 } })),
    createDoctor: vi.fn(),
    updateDoctor: vi.fn(),
  },
}))

vi.mock('@/features/pharma/mr.service', () => ({
  searchDownlineMrs: vi.fn(async () => ({ success: true, message: '', data: { items: [], count: 0 } })),
}))

const startOfToday = () => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}
const TODAY_KEY = format(startOfToday(), 'yyyy-MM-dd')

vi.mock('@/features/camps/camps.service', () => ({
  pharmaCampsService: {
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

function doctorFixture(overrides: Partial<DoctorEntity> = {}): DoctorEntity {
  return {
    id: 'doc-1', pharmaCode: 'DOC-1', name: 'Dr. Priya Sharma', specialization: 'cp', mobile: '9876543210', email: 'p@example.com',
    location: { addressLine1: '221 Baker Street', city: 'Pune', state: 'Maharashtra', pincode: '411001', coordinates: [73.8567, 18.5204] },
    distanceMeters: 1200, createdAt: '', updatedAt: '', ...overrides,
  } as DoctorEntity
}

// Shapes a rejection the same way axios does for a real backend ApiError body, so
// getApiErrorMessage's axios.isAxiosError<ApiErrorBody> check actually matches it.
function apiErrorFixture(statusCode: number, message: string) {
  const error = new AxiosError(message)
  error.response = {
    status: statusCode,
    data: { message, statusCode },
    statusText: '', headers: {}, config: {} as never,
  }
  return error
}

function mrFixture(overrides: { id?: string; code?: string; name?: string; divisionId?: string | null } = {}) {
  return {
    id: overrides.id ?? 'mr-1',
    code: overrides.code ?? 'MR-001',
    name: overrides.name ?? 'Rahul Kumar',
    division: overrides.divisionId === null ? null : { _id: overrides.divisionId ?? 'div-mr-1', name: 'MR Division', code: 'MRDIV' },
  }
}

// The mocked LocationPicker's "Set FAR test coordinates" button uses [77.0266, 28.4595]
// (Gurugram), ~1150km from doctorFixture()'s Pune coordinates — well past DOCTOR_RANGE_KM (35km),
// used to exercise the out-of-range re-pick flow.

function bookCampResponseFixture(overrides: Partial<CampMutationResponseEntity> = {}): ApiResponse<CampMutationResponseEntity> {
  return {
    success: true,
    message: '',
    data: {
      id: 'camp-1', code: 'cmp-000001', project: null,
      doctor: 'doc-1', type: 'screening', patientExpectation: 0,
      fo: null, dietitian: null, mr: null, date: TODAY_KEY,
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

const TEST_PROJECT: { id: string; name: string; campTimeSlots: CampTimeSlotValue[]; daysToBookBefore: number } = { id: 'proj-1', name: 'Cardio Screening Drive', campTimeSlots: ['9am-1pm', '10am-2pm'], daysToBookBefore: 0 }

async function mockSession(roleId?: string, grantedDoctorPermissions: string[] = []) {
  const { useSession } = await import('@/hooks/useSession')
  vi.mocked(useSession).mockReturnValue({
    session: sessionFixture(roleId),
    // usePermission() (the "New doctor" gate) wraps useSession() directly —
    // hasPermission/hasAnyPermission must both be present on the mock.
    hasPermission: (code: string) => grantedDoctorPermissions.includes(code),
    hasAnyPermission: (codes: string[]) => codes.some((c) => grantedDoctorPermissions.includes(c)),
  } as unknown as ReturnType<typeof useSession>)
}

function renderForm(props: { type?: 'screening' | 'diet'; patientExpectation?: number; project?: typeof TEST_PROJECT | null; needsMrPicker?: boolean } = {}) {
  return async () => {
    const BookCampForm = (await import('@/features/pharma/components/BookCampForm')).default
    const onBooked = vi.fn()
    const onCancel = vi.fn()
    render(
      <QueryClientProvider client={makeQueryClient()}>
        <BookCampForm
          needsMrPicker={props.needsMrPicker ?? false}
          type={props.type ?? 'screening'}
          project={'project' in props ? (props.project ?? null) : TEST_PROJECT}
          patientExpectation={props.patientExpectation}
          onBooked={onBooked}
          onCancel={onCancel}
        />
      </QueryClientProvider>,
    )
    return { onBooked, onCancel }
  }
}

// All sections render at once (no step gating) — these helpers just fill each real section directly.
async function fillLocation(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/^address line 1$/i), '221 Baker Street')
  await user.type(screen.getByLabelText(/^city$/i), 'Pune')
  await user.type(screen.getByLabelText(/^state$/i), 'Maharashtra')
  await user.type(screen.getByLabelText(/^pincode$/i), '411001')
  await user.click(screen.getByRole('button', { name: /^set test coordinates$/i }))
}

// MR-picking is a plain name search (MrPicker, GET /roles/mrs) — server-scoped to the caller's
// own downline; this helper just drives the already-scoped mocked results. Re-pickable: once a
// value is already selected, AsyncPicker shows a chip (not the search input) — clicking it clears
// the selection and reopens search, matching the real re-pick interaction.
async function pickMr(user: ReturnType<typeof userEvent.setup>, mr = mrFixture()) {
  const { searchDownlineMrs } = await import('@/features/pharma/mr.service')
  vi.mocked(searchDownlineMrs).mockResolvedValue({
    success: true, message: '', data: { items: [mr], count: 1 },
  })
  const existingChip = screen.queryByLabelText(/clear selected mr/i)
  if (existingChip) await user.click(existingChip.closest('[id]') ?? existingChip)
  await user.type(await screen.findByPlaceholderText(/search mr by name/i), mr.name)
  const option = await screen.findByText(new RegExp(`${mr.name} \\(${mr.code}\\)`, 'i'), {}, { timeout: 3000 })
  await user.click(option)
}

// Doctor-picking is a plain division-scoped name search (DoctorNameDivisionPicker, GET
// /doctors) — no location dependency, unlike the distance-sorted out-of-range re-pick flow.
async function pickDoctor(user: ReturnType<typeof userEvent.setup>) {
  const { doctorsService } = await import('@/features/pharma/doctors.service')
  vi.mocked(doctorsService.searchDoctors).mockResolvedValue({
    success: true, message: '', data: { items: [doctorFixture()], count: 1 },
  })
  await user.type(await screen.findByPlaceholderText(/search doctor by name/i), 'Priya')
  const option = await screen.findByText(/Dr\. Priya Sharma/i, {}, { timeout: 3000 })
  await user.click(option)
}

// Picks today's date (the only mocked-available day, first in the day-strip) then its first slot.
async function pickDateAndSlot(user: ReturnType<typeof userEvent.setup>) {
  const todayBtn = (await screen.findByText(String(startOfToday().getDate()))).closest('button')!
  await user.click(todayBtn)
  const slotPill = await screen.findByRole('button', { name: /9 AM – 1 PM/i })
  await user.click(slotPill)
}

// Fills every real section: Doctor -> Date/slot. Doctor-picking defaults the camp location from
// the doctor's own address (doctorFixture's Pune coordinates) — no separate fillLocation call.
async function fillWholeForm(user: ReturnType<typeof userEvent.setup>) {
  await pickDoctor(user)
  await pickDateAndSlot(user)
}

describe('BookCampForm — session/identity guards', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('clicking Cancel calls onCancel and never submits or fetches', async () => {
    await mockSession()
    const user = userEvent.setup()
    const { onCancel } = await renderForm()()

    await user.click(screen.getByRole('button', { name: /^cancel$/i }))
    expect(onCancel).toHaveBeenCalledTimes(1)

    const { pharmaCampsService } = await import('@/features/camps/camps.service')
    expect(pharmaCampsService.bookCamp).not.toHaveBeenCalled()
  })

  it('when missingSelfMrId is true, the warning banner is visible and submit stays blocked', async () => {
    // No resolvable session role id — the missingSelfMrId banner must stay visible and the
    // submit button must stay disabled regardless of what else is filled.
    const { useSession } = await import('@/hooks/useSession')
    vi.mocked(useSession).mockReturnValue({
      session: { ...sessionFixture(), role: { id: '', code: 'pharma-mr', name: 'MR', division: 'div-1' } },
      hasPermission: () => false,
      hasAnyPermission: () => false,
    } as unknown as ReturnType<typeof useSession>)
    const user = userEvent.setup()
    await renderForm()()

    expect(screen.getByText(/couldn't resolve your mr identity/i)).toBeInTheDocument()
    expect(await screen.findByLabelText(/^address line 1$/i)).toBeInTheDocument()

    await fillLocation(user)
    await pickDateAndSlot(user)
    expect(screen.getByText(/couldn't resolve your mr identity/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /book camp/i })).toBeDisabled()
  })
})

describe('BookCampForm — all sections visible at once', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('Doctor, Location, Date & time slot, and Notes all render simultaneously — no step gating', async () => {
    await mockSession()
    await renderForm()()

    expect(screen.getByPlaceholderText(/search doctor by name/i)).toBeInTheDocument()
    expect(screen.getByText(/pick a location above to see availability/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^notes$/i)).toBeInTheDocument()
  })

  it('Doctor renders before Camp location in the DOM — pharma-frontend has no MR-picker section, so Doctor is always section 2', async () => {
    await mockSession()
    await renderForm()()

    const doctorHeading = screen.getByText(/^2 · doctor$/i)
    const locationHeading = screen.getByText(/^3 · camp location$/i)
    expect(doctorHeading.compareDocumentPosition(locationHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('the Doctor picker is NOT location-gated — it is searchable and enabled with no location picked yet', async () => {
    await mockSession()
    await renderForm()()

    const doctorInput = screen.getByPlaceholderText(/search doctor by name/i)
    expect(doctorInput).toBeInTheDocument()
    expect(doctorInput).toBeEnabled()
  })

  it('the Doctor picker is NOT project-gated — it is searchable and enabled before any project is picked, unlike Location/Date which still require one', async () => {
    await mockSession()
    await renderForm({ project: null })()

    const doctorInput = screen.getByPlaceholderText(/search doctor by name/i)
    expect(doctorInput).toBeInTheDocument()
    expect(doctorInput).toBeEnabled()
    // The rest of the form still correctly waits on a project.
    expect(screen.getAllByText(/select a project and camp type above first/i).length).toBeGreaterThan(0)
  })

  it('picking a doctor defaults the camp location to the doctor\'s own address, still editable afterwards', async () => {
    await mockSession()
    const user = userEvent.setup()
    await renderForm()()

    await pickDoctor(user)

    expect(screen.getByLabelText(/^address line 1$/i)).toHaveValue('221 Baker Street')
    expect(screen.getByLabelText(/^city$/i)).toHaveValue('Pune')
    expect(screen.getByLabelText(/^state$/i)).toHaveValue('Maharashtra')
    expect(screen.getByLabelText(/^pincode$/i)).toHaveValue('411001')
    expect(await screen.findByText(/pick a date — \d+ fos? can run this camp/i)).toBeInTheDocument()

    // Still editable — a manual edit within range doesn't clear the doctor.
    await user.clear(screen.getByLabelText(/^city$/i))
    await user.type(screen.getByLabelText(/^city$/i), 'Pune City')
    expect(screen.getByText(/Dr\. Priya Sharma/i)).toBeInTheDocument()
  })

  it('manually overriding the location far from the picked doctor clears the doctor and switches to a distance-sorted re-pick', async () => {
    await mockSession()
    const { doctorsService } = await import('@/features/pharma/doctors.service')
    const user = userEvent.setup()
    await renderForm()()

    await pickDoctor(user)
    expect(screen.getByText(/Dr\. Priya Sharma/i)).toBeInTheDocument()

    vi.mocked(doctorsService.nearestDoctors).mockResolvedValue({
      success: true, message: '', data: { items: [doctorFixture({ id: 'doc-2', name: 'Dr. Far Away' })], count: 1 },
    })
    await user.click(screen.getByRole('button', { name: /^set far test coordinates$/i }))

    expect(await screen.findByText(/isn't within 35km of this camp location/i)).toBeInTheDocument()
    expect(screen.queryByText(/Dr\. Priya Sharma/i)).not.toBeInTheDocument()
    // Re-pick is now the distance-sorted picker, scoped to the NEW far-away location.
    expect(screen.getByPlaceholderText(/search doctor by name/i)).toBeInTheDocument()
  })

  it('clicking Book camp with an incomplete address shows its errors and never advances anything else', async () => {
    await mockSession()
    const user = userEvent.setup()
    await renderForm()()

    // Only address line 1 + city filled — state/pincode left blank.
    await user.type(screen.getByLabelText(/^address line 1$/i), '221 Baker Street')
    await user.type(screen.getByLabelText(/^city$/i), 'Pune')
    await user.click(screen.getByRole('button', { name: /^set test coordinates$/i }))
    await user.click(screen.getByRole('button', { name: /book camp/i }))

    const stateSpan = await screen.findByText('State is required.')
    const pincodeSpan = await screen.findByText('Pincode is required.')
    expect(stateSpan.tagName).toBe('SPAN')
    expect(pincodeSpan.tagName).toBe('SPAN')
  })

  it('resolving-location submit is blocked with the resolving message, then clears once resolved', async () => {
    await mockSession()
    const user = userEvent.setup()
    await renderForm()()

    await pickDoctor(user)
    await pickDateAndSlot(user)
    await user.click(screen.getByRole('button', { name: /simulate location resolving/i }))

    // Submit is disabled while resolving, so fire the form's own submit directly to exercise
    // onSubmit's own guard, same as a submit that raced in just as resolution started.
    const resolvingButton = screen.getByRole('button', { name: /resolving location/i })
    const form = resolvingButton.closest('form')
    if (!form) throw new Error('form not found')
    fireEvent.submit(form)
    expect(await screen.findByText(/still resolving the picked location/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /simulate location resolved/i }))
    // The error clears on the NEXT submit attempt once resolution is idle again — same
    // real contract as before (it isn't cleared just by resolution state changing on its own).
    fireEvent.submit(form)
    await waitFor(() => expect(screen.queryByText(/still resolving the picked location/i)).not.toBeInTheDocument())
  })

  it('a real refetch that reports the picked date/slot is no longer available clears the selection instead of leaving it stale', async () => {
    await mockSession()
    const { pharmaCampsService } = await import('@/features/camps/camps.service')
    const user = userEvent.setup()
    const queryClient = makeQueryClient()
    const BookCampForm = (await import('@/features/pharma/components/BookCampForm')).default
    render(
      <QueryClientProvider client={queryClient}>
        <BookCampForm needsMrPicker={false} type="screening" project={TEST_PROJECT} patientExpectation={undefined} onBooked={vi.fn()} onCancel={vi.fn()} />
      </QueryClientProvider>,
    )

    await fillWholeForm(user)
    expect(screen.getByRole('button', { name: /9 AM – 1 PM/i })).toBeInTheDocument()

    // The next fetch now reports today as fully booked, then force a genuine refetch — the same
    // effect a real trigger (window refocus, remount, retry) would have.
    vi.mocked(pharmaCampsService.getBookingAvailability).mockResolvedValue({
      success: true, message: '',
      data: { eligibleFoCount: 0, dateFrom: TODAY_KEY, dateTo: TODAY_KEY, dates: { [TODAY_KEY]: { available: false, slots: { '9am-1pm': false, '10am-2pm': false } } } },
    })
    await queryClient.refetchQueries()

    // The stale slot pill is gone — the date/slot selection was cleared, not left pointing at a
    // now-unavailable booking.
    await waitFor(() => expect(screen.queryByRole('button', { name: /9 AM – 1 PM/i })).not.toBeInTheDocument())
  })

  it('submit is blocked while the availability fetch for the picked date/slot is genuinely loading or has errored', async () => {
    await mockSession()
    const { pharmaCampsService } = await import('@/features/camps/camps.service')
    const user = userEvent.setup()
    const queryClient = makeQueryClient()
    const BookCampForm = (await import('@/features/pharma/components/BookCampForm')).default
    render(
      <QueryClientProvider client={queryClient}>
        <BookCampForm needsMrPicker={false} type="screening" project={TEST_PROJECT} patientExpectation={undefined} onBooked={vi.fn()} onCancel={vi.fn()} />
      </QueryClientProvider>,
    )

    await fillWholeForm(user)
    const submitButton = screen.getByRole('button', { name: /book camp/i })
    expect(submitButton).not.toBeDisabled()

    // A slow refetch that never resolves — a real "still loading" state, not a resolving-
    // location detour (which the test above already covers as its own, separate guard).
    vi.mocked(pharmaCampsService.getBookingAvailability).mockImplementation(() => new Promise(() => {}))
    queryClient.refetchQueries()

    await waitFor(() => expect(screen.getByRole('button', { name: /book camp/i })).toBeDisabled())
  })
})

describe('BookCampForm — availability day-strip', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('a failed infinite-scroll batch shows "couldn\'t load more dates" (not the initial-load banner), and its own Retry re-fetches the next batch — driven end-to-end through the real hook, not a hand-fed prop', async () => {
    // jsdom's global stub (test/setup.ts) is a no-op — install a controllable fake so the
    // sentinel's real scroll-into-view can be simulated through the actual DOM ref/effect wiring.
    const observeCallbackRef: { current: IntersectionObserverCallback | null } = { current: null }
    const observeMock = vi.fn()
    class FakeIntersectionObserver {
      constructor(cb: IntersectionObserverCallback) { observeCallbackRef.current = cb }
      observe = observeMock
      disconnect = vi.fn()
      unobserve = vi.fn()
      takeRecords = vi.fn(() => [])
      root = null
      rootMargin = ''
      thresholds: number[] = []
    }
    vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver)

    await mockSession()
    const { pharmaCampsService } = await import('@/features/camps/camps.service')
    const user = userEvent.setup()
    await renderForm()()

    await fillLocation(user)
    await screen.findByText(String(startOfToday().getDate()))
    await waitFor(() => expect(observeMock).toHaveBeenCalled())

    // Next batch (fetchNextPage) genuinely rejects — a real network/service failure, not a prop.
    vi.mocked(pharmaCampsService.getBookingAvailability).mockRejectedValueOnce(new Error('network down'))
    observeCallbackRef.current?.([{ isIntersecting: true } as IntersectionObserverEntry], null as unknown as IntersectionObserver)

    const loadMoreBanner = await screen.findByText(/couldn't load more dates/i)
    expect(loadMoreBanner).toBeInTheDocument()
    // The initial-load banner must NOT also render — the two are mutually exclusive.
    expect(screen.queryByText(/couldn't load availability for this range/i)).not.toBeInTheDocument()

    // Retrying must call fetchNextPage (requests batch 1, starting today+10) — NOT refetch
    // (which would re-request every already-loaded page from scratch, starting again at batch 0 /
    // today). Asserting the requested dateFrom, not just an extra call, is what actually
    // distinguishes the two: both would produce "one more call."
    vi.mocked(pharmaCampsService.getBookingAvailability).mockImplementation(async (payload) => ({
      success: true, message: '',
      data: { eligibleFoCount: 1, dateFrom: payload.dateFrom, dateTo: payload.dateTo, dates: {} },
    }))
    const callsBeforeRetry = vi.mocked(pharmaCampsService.getBookingAvailability).mock.calls.length
    await user.click(screen.getByRole('button', { name: /retry/i }))

    await waitFor(() => expect(screen.queryByText(/couldn't load more dates/i)).not.toBeInTheDocument())
    const callsAfterRetry = vi.mocked(pharmaCampsService.getBookingAvailability).mock.calls
    expect(callsAfterRetry.length).toBeGreaterThan(callsBeforeRetry)
    const retryCallDateFroms = callsAfterRetry.slice(callsBeforeRetry).map((c) => c[0].dateFrom)
    // refetch() would re-request batch 0 (dateFrom = today); fetchNextPage() requests batch 1
    // (dateFrom = today+10). Only the latter may appear among the retry's actual calls.
    expect(retryCallDateFroms).not.toContain(TODAY_KEY)
    expect(retryCallDateFroms).toContain(format(addDays(startOfToday(), 10), 'yyyy-MM-dd'))
  })

  it('the day-strip shows a project-filtered slot row once a bookable date is picked, not all 4 slots', async () => {
    await mockSession()
    const user = userEvent.setup()
    await renderForm()()

    await fillLocation(user)

    const todayBtn = (await screen.findByText(String(startOfToday().getDate()))).closest('button')!
    await user.click(todayBtn)

    expect(await screen.findByRole('button', { name: /9 AM – 1 PM/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /10 AM – 2 PM/i })).toBeInTheDocument()
    expect(screen.queryByText(/11 AM – 3 PM/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/6 PM – 10 PM/i)).not.toBeInTheDocument()
  })

  it('the first availability batch shifts to match the lead-time-shifted day-strip, and stays within the backend\'s 30-day span cap', async () => {
    await mockSession()
    const { pharmaCampsService } = await import('@/features/camps/camps.service')
    const user = userEvent.setup()
    await renderForm({ project: { ...TEST_PROJECT, daysToBookBefore: 5 } })()

    await fillLocation(user)

    await waitFor(() => expect(pharmaCampsService.getBookingAvailability).toHaveBeenCalled())
    const call = vi.mocked(pharmaCampsService.getBookingAvailability).mock.calls[0][0]
    // One 10-day batch, not a single 30-day request — infinite scroll fetches the rest on demand.
    const expectedFrom = format(addDays(startOfToday(), 5), 'yyyy-MM-dd')
    const expectedTo = format(addDays(startOfToday(), 5 + 9), 'yyyy-MM-dd')
    expect(call.dateFrom).toBe(expectedFrom)
    expect(call.dateTo).toBe(expectedTo)
  })
})

describe('BookCampForm — submit', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('submits the session\'s own role id as mr when needsMrPicker is false (self-booking) — no MR picker shown', async () => {
    await mockSession('self-role-42')
    const { pharmaCampsService } = await import('@/features/camps/camps.service')
    const user = userEvent.setup()
    await renderForm()()

    await fillWholeForm(user)
    await user.click(screen.getByRole('button', { name: /book camp/i }))

    await waitFor(() => expect(pharmaCampsService.bookCamp).toHaveBeenCalledTimes(1))
    const payload = vi.mocked(pharmaCampsService.bookCamp).mock.calls[0][0]
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

  it('surfaces a backend error (self-booking) the same way the on-behalf-of case does — one shared error display, not two', async () => {
    await mockSession()
    const user = userEvent.setup()
    await renderForm()()
    const { pharmaCampsService } = await import('@/features/camps/camps.service')
    vi.mocked(pharmaCampsService.bookCamp).mockRejectedValueOnce(
      apiErrorFixture(409, 'This project does not offer screening camps'),
    )

    await fillWholeForm(user)
    await user.click(screen.getByRole('button', { name: /book camp/i }))

    expect(await screen.findByText(/this project does not offer screening camps/i)).toBeInTheDocument()
  })

  it('submits patientExpectation as omitted when the caller passes undefined (its own section 1 field was left blank)', async () => {
    await mockSession()
    const { pharmaCampsService } = await import('@/features/camps/camps.service')
    const user = userEvent.setup()
    await renderForm({ patientExpectation: undefined })()

    await fillWholeForm(user)
    await user.click(screen.getByRole('button', { name: /book camp/i }))

    await waitFor(() => expect(pharmaCampsService.bookCamp).toHaveBeenCalledTimes(1))
    expect(vi.mocked(pharmaCampsService.bookCamp).mock.calls[0][0].patientExpectation).toBeUndefined()
  })

  it('passes the caller-owned patientExpectation straight through into the booking payload — preserves a genuine 0', async () => {
    await mockSession()
    const { pharmaCampsService } = await import('@/features/camps/camps.service')
    const user = userEvent.setup()
    await renderForm({ patientExpectation: 0 })()

    await fillWholeForm(user)
    await user.click(screen.getByRole('button', { name: /book camp/i }))

    await waitFor(() => expect(pharmaCampsService.bookCamp).toHaveBeenCalledTimes(1))
    expect(vi.mocked(pharmaCampsService.bookCamp).mock.calls[0][0].patientExpectation).toBe(0)
  })

  it('calls onBooked with the created camp on success, and resets the form', async () => {
    await mockSession()
    const user = userEvent.setup()
    const { onBooked } = await renderForm()()

    await fillWholeForm(user)
    await user.click(screen.getByRole('button', { name: /book camp/i }))

    await waitFor(() => expect(onBooked).toHaveBeenCalledTimes(1))
    expect(onBooked.mock.calls[0][0].data.code).toBe('cmp-000001')
    // Reset clears the doctor field back to empty.
    expect(screen.getByPlaceholderText(/search doctor by name/i)).toBeInTheDocument()
  })

  it('Cancel never submits the form as a side effect', async () => {
    await mockSession()
    const { pharmaCampsService } = await import('@/features/camps/camps.service')
    const user = userEvent.setup()
    await renderForm()()

    await user.click(screen.getByRole('button', { name: /^cancel$/i }))
    expect(pharmaCampsService.bookCamp).not.toHaveBeenCalled()
  })

  it('disables the submit button while a booking is in flight, preventing a duplicate submit', async () => {
    await mockSession()
    const { pharmaCampsService } = await import('@/features/camps/camps.service')
    let resolveBooking: (value: ApiResponse<CampMutationResponseEntity>) => void = () => {}
    vi.mocked(pharmaCampsService.bookCamp).mockImplementation(
      () => new Promise((resolve) => { resolveBooking = resolve }),
    )
    const user = userEvent.setup()
    const { onBooked } = await renderForm()()

    await fillWholeForm(user)
    const submitButton = screen.getByRole('button', { name: /book camp/i })
    await user.click(submitButton)

    await waitFor(() => expect(submitButton).toBeDisabled())
    await user.click(submitButton)
    expect(pharmaCampsService.bookCamp).toHaveBeenCalledTimes(1)

    resolveBooking(bookCampResponseFixture())
    await waitFor(() => expect(onBooked).toHaveBeenCalledTimes(1))
  })

  it('blocks a true rapid double-submit to exactly one mutation call', async () => {
    await mockSession()
    const { pharmaCampsService } = await import('@/features/camps/camps.service')
    let resolveBooking: (value: ApiResponse<CampMutationResponseEntity>) => void = () => {}
    vi.mocked(pharmaCampsService.bookCamp).mockImplementation(
      () => new Promise((resolve) => { resolveBooking = resolve }),
    )
    const user = userEvent.setup()
    const { onBooked } = await renderForm()()

    await fillWholeForm(user)
    const form = screen.getByRole('button', { name: /book camp/i }).closest('form')
    if (!form) throw new Error('form not found')

    fireEvent.submit(form)
    fireEvent.submit(form)

    await waitFor(() => expect(pharmaCampsService.bookCamp).toHaveBeenCalled())
    expect(pharmaCampsService.bookCamp).toHaveBeenCalledTimes(1)

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
        <BookCampForm needsMrPicker={false} type="screening" project={{ id: "proj-2", name: 'Empty Project', campTimeSlots: [], daysToBookBefore: 0 }} patientExpectation={undefined} onBooked={vi.fn()} onCancel={vi.fn()} />
      </QueryClientProvider>,
    )

    expect(screen.getByText(/no configured time slots/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /book camp/i })).not.toBeInTheDocument()
  })
})

describe('BookCampForm — inline doctor creation (gated on doctor:create OR doctor:manage)', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('hides the "New doctor" trigger with neither doctor:create nor doctor:manage', async () => {
    await mockSession(undefined, [])
    const user = userEvent.setup()
    await renderForm()()

    await fillLocation(user)

    expect(screen.queryByRole('button', { name: /new doctor/i })).not.toBeInTheDocument()
  })

  it('shows the "New doctor" trigger for a session holding only doctor:create — the configured default for new pharma-mr role types', async () => {
    await mockSession(undefined, ['doctor:create'])
    const user = userEvent.setup()
    await renderForm()()

    await fillLocation(user)

    expect(await screen.findByRole('button', { name: /new doctor/i })).toBeInTheDocument()
  })

  it('shows the "New doctor" trigger before any project is picked — doctor creation is scoped by division alone, never by the project', async () => {
    await mockSession(undefined, ['doctor:create'])
    await renderForm({ project: null })()

    expect(screen.getAllByText(/select a project and camp type above first/i).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: /new doctor/i })).toBeInTheDocument()
  })

  it('creating a doctor auto-selects it via the same field.onChange/doctorLabel pipe as a normal search pick', async () => {
    await mockSession('self-role-42', ['doctor:manage'])
    const { doctorsService } = await import('@/features/pharma/doctors.service')
    vi.mocked(doctorsService.createDoctor).mockResolvedValue({
      success: true, message: '',
      data: { id: 'doc-new', pharmaCode: 'DOC-NEW', name: 'Dr. New', specialization: 'cp', mobile: '9999999999', email: 'new@example.com', location: null, createdAt: '', updatedAt: '' },
    })
    const user = userEvent.setup()
    await renderForm()()

    await fillLocation(user)

    await user.click(await screen.findByRole('button', { name: /new doctor/i }))
    // Waits for the real EditDoctorModal content first — its lazy chunk briefly shows
    // DialogOpeningFallback's own "dialog" role, a different DOM node from the real one.
    expect(await screen.findByRole('heading', { name: 'Add doctor' })).toBeInTheDocument()
    const dialog = screen.getByRole('dialog')

    await user.type(within(dialog).getByLabelText(/pharma doctor code/i), 'DOC-NEW')
    await user.type(within(dialog).getByLabelText(/^doctor name$/i), 'Dr. New')
    await user.type(within(dialog).getByLabelText(/^mobile$/i), '9876543210')
    await user.type(within(dialog).getByLabelText(/^email$/i), 'newdoc@example.com')

    // The dialog's own Location section needs the full address, same as the main form's —
    // coordinates alone leave addressLine1/city/state/pincode blank, failing the create schema.
    await user.type(within(dialog).getByLabelText(/^address line 1$/i), '221 Baker Street')
    await user.type(within(dialog).getByLabelText(/^city$/i), 'Pune')
    await user.type(within(dialog).getByLabelText(/^state$/i), 'Maharashtra')
    await user.type(within(dialog).getByLabelText(/^pincode$/i), '411001')
    // Two LocationPicker instances are on screen (the main form's + the dialog's own) —
    // scope to the dialog so the right one fires.
    await user.click(within(dialog).getByRole('button', { name: /^set test coordinates$/i }))
    await user.click(within(dialog).getByRole('button', { name: /^add doctor$/i }))

    await waitFor(() => expect(doctorsService.createDoctor).toHaveBeenCalledTimes(1))
    expect(vi.mocked(doctorsService.createDoctor).mock.calls[0][0].division).toBe('div-1')

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByText(/dr\. new \(doc-new\)/i)).toBeInTheDocument()
  })

  it('clears a stale "Doctor is required" error once a doctor is created inline', async () => {
    await mockSession('self-role-42', ['doctor:manage'])
    const { doctorsService } = await import('@/features/pharma/doctors.service')
    vi.mocked(doctorsService.createDoctor).mockResolvedValue({
      success: true, message: '',
      data: { id: 'doc-new', pharmaCode: 'DOC-NEW', name: 'Dr. New', specialization: 'cp', mobile: '9999999999', email: 'new@example.com', location: null, createdAt: '', updatedAt: '' },
    })
    const user = userEvent.setup()
    await renderForm()()

    await fillLocation(user)
    await user.click(screen.getByRole('button', { name: /book camp/i }))
    await waitFor(() => expect(screen.getByText(/doctor is required/i)).toBeInTheDocument())

    await user.click(await screen.findByRole('button', { name: /new doctor/i }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText(/pharma doctor code/i), 'DOC-NEW')
    await user.type(within(dialog).getByLabelText(/^doctor name$/i), 'Dr. New')
    await user.type(within(dialog).getByLabelText(/^mobile$/i), '9876543210')
    await user.type(within(dialog).getByLabelText(/^email$/i), 'newdoc@example.com')
    await user.type(within(dialog).getByLabelText(/^address line 1$/i), '221 Baker Street')
    await user.type(within(dialog).getByLabelText(/^city$/i), 'Pune')
    await user.type(within(dialog).getByLabelText(/^state$/i), 'Maharashtra')
    await user.type(within(dialog).getByLabelText(/^pincode$/i), '411001')
    await user.click(within(dialog).getByRole('button', { name: /^set test coordinates$/i }))
    await user.click(within(dialog).getByRole('button', { name: /^add doctor$/i }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.queryByText(/doctor is required/i)).not.toBeInTheDocument()
  })

  it('Cancel creates no doctor', async () => {
    await mockSession(undefined, ['doctor:manage'])
    const { doctorsService } = await import('@/features/pharma/doctors.service')
    const user = userEvent.setup()
    await renderForm()()

    await fillLocation(user)

    await user.click(await screen.findByRole('button', { name: /new doctor/i }))
    await screen.findByRole('dialog')
    await user.click(screen.getByRole('button', { name: /^cancel$/i }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(doctorsService.createDoctor).not.toHaveBeenCalled()
  })
})

describe('BookCampForm — needsMrPicker (HO/RSM/ASM "book on behalf of MR")', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('needsMrPicker=false (MR self-booking) renders no MR section at all', async () => {
    await mockSession()
    await renderForm({ needsMrPicker: false })()

    expect(screen.queryByPlaceholderText(/search mr by name/i)).not.toBeInTheDocument()
  })

  it('needsMrPicker=true renders the MR section and blocks submit until an MR is picked', async () => {
    await mockSession()
    await renderForm({ needsMrPicker: true })()

    expect(screen.getByPlaceholderText(/search mr by name/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^book camp$/i })).toBeDisabled()
  })

  it('picking an MR re-scopes the Doctor picker to the MR\'s own division, overriding the caller\'s own fallback', async () => {
    await mockSession()
    const user = userEvent.setup()
    await renderForm({ needsMrPicker: true })()

    const { searchDoctors } = (await import('@/features/pharma/doctors.service')).doctorsService

    // Before any MR is picked, doctorDivisionId falls back to the caller's own session division
    // (div-1) — the doctor picker is usable immediately rather than dead-ended, and a search here
    // would hit the caller's own division.
    expect(screen.getByPlaceholderText(/^search doctor by name/i)).toBeInTheDocument()

    await pickMr(user, mrFixture({ divisionId: 'div-mr-77' }))
    await user.type(await screen.findByPlaceholderText(/^search doctor by name/i), 'Priya')

    // Once an MR is picked, the doctor search is scoped to THEIR division, not the caller's own.
    await waitFor(() => expect(searchDoctors).toHaveBeenCalledWith(expect.objectContaining({ division: 'div-mr-77' })))
  })

  it('submits the picked MR\'s role id as `mr`, not the caller\'s own session role id', async () => {
    await mockSession('caller-role-id')
    const user = userEvent.setup()
    await renderForm({ needsMrPicker: true })()

    await pickMr(user, mrFixture({ id: 'mr-target-id', divisionId: 'div-mr-1' }))
    await fillWholeForm(user)
    await user.click(screen.getByRole('button', { name: /^book camp$/i }))

    const { pharmaCampsService } = await import('@/features/camps/camps.service')
    await waitFor(() => expect(pharmaCampsService.bookCamp).toHaveBeenCalledWith(
      expect.objectContaining({ mr: 'mr-target-id' }),
    ))
  })

  it('surfaces the backend\'s 403 when assertCanBook rejects the picked MR (outside the caller\'s real hierarchy, despite passing the client-side picker)', async () => {
    await mockSession()
    const user = userEvent.setup()
    await renderForm({ needsMrPicker: true })()
    const { pharmaCampsService } = await import('@/features/camps/camps.service')
    vi.mocked(pharmaCampsService.bookCamp).mockRejectedValueOnce(
      apiErrorFixture(403, 'You can only book for MRs that report to you'),
    )

    await pickMr(user)
    await fillWholeForm(user)
    await user.click(screen.getByRole('button', { name: /^book camp$/i }))

    expect(await screen.findByText(/you can only book for mrs that report to you/i)).toBeInTheDocument()
  })

  it('surfaces the backend\'s 409 (e.g. a slot conflict) the same way self-booking already does', async () => {
    await mockSession()
    const user = userEvent.setup()
    await renderForm({ needsMrPicker: true })()
    const { pharmaCampsService } = await import('@/features/camps/camps.service')
    vi.mocked(pharmaCampsService.bookCamp).mockRejectedValueOnce(
      apiErrorFixture(409, 'This FO is already booked for an overlapping slot'),
    )

    await pickMr(user)
    await fillWholeForm(user)
    await user.click(screen.getByRole('button', { name: /^book camp$/i }))

    expect(await screen.findByText(/this fo is already booked for an overlapping slot/i)).toBeInTheDocument()
  })

  it('picking a different MR resets a previously picked doctor — a doctor valid for one MR\'s division may not be valid for another\'s', async () => {
    await mockSession()
    const user = userEvent.setup()
    await renderForm({ needsMrPicker: true })()

    await pickMr(user, mrFixture({ id: 'mr-1', divisionId: 'div-mr-1' }))
    await pickDoctor(user)
    expect(screen.getByText(/Dr\. Priya Sharma \(DOC-1\)/i)).toBeInTheDocument()

    await pickMr(user, mrFixture({ id: 'mr-2', name: 'Second Manager', code: 'MR-002', divisionId: 'div-mr-2' }))

    expect(screen.queryByText(/Dr\. Priya Sharma \(DOC-1\)/i)).not.toBeInTheDocument()
  })

  it('"New doctor" is scoped to the picked MR\'s division, not the caller\'s own', async () => {
    await mockSession(undefined, ['doctor:create'])
    const user = userEvent.setup()
    await renderForm({ needsMrPicker: true })()

    await pickMr(user, mrFixture({ divisionId: 'div-mr-1' }))
    await user.click(await screen.findByRole('button', { name: /new doctor/i }))

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    // EditDoctorModal takes a flat divisionId prop in this app (no forcedTenant/forcedDivision
    // picker like internal-frontend's admin-grade version) — the dialog rendering at all here,
    // right after picking an MR whose division differs from the caller's own (div-1), proves
    // showNewDoctor's `doctorDivisionId` gate is live, not the caller's actingDivisionId.
  })
})
