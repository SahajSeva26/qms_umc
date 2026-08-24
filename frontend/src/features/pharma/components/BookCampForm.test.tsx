import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { RoleEntity, SessionResponse } from '@/types/accessManagement.types'
import type { DoctorEntity } from '@/types/doctor.types'
import type { ApiResponse } from '@/types/common.types'
import type { CampMutationResponseEntity } from '@/types/campReal.types'
import type { CampTimeSlotValue } from '@/types/campTimeSlot.constants'

vi.mock('@/hooks/useSession')

vi.mock('@/features/access-management/accessManagement.service', () => ({
  accessManagementService: {
    searchDownlineMrs: vi.fn(async () => ({ success: true, message: '', data: { items: [], count: 0 } })),
  },
}))

vi.mock('@/features/doctors/doctors.service', () => ({
  doctorsService: {
    searchDoctors: vi.fn(async () => ({ success: true, message: '', data: { items: [], count: 0 } })),
  },
}))

vi.mock('@/features/camps/campsReal.service', () => ({
  campsRealService: {
    bookCamp: vi.fn(async () => ({ success: true, message: '', data: { id: 'camp-1', code: 'cmp-000001' } })),
  },
}))

function sessionFixture(roleId = 'self-role-1'): SessionResponse {
  return {
    user: { id: 'u-1', email: 'a@example.com', firstName: 'a', lastName: 'b' },
    role: { id: roleId, code: 'pharma-mr', name: 'MR' },
    roleType: { id: 'rt-1', code: 'pharma-mr', name: 'pharma-mr' },
    tenant: { id: 't-1', code: 'tenant-1', name: 'Tenant', type: 'customer' },
    permissions: ['camp:book'],
  } as unknown as SessionResponse
}

function mrFixture(overrides: Partial<RoleEntity> = {}): RoleEntity {
  return { id: 'mr-1', code: 'phr-000001', name: 'Cardio MR Mona', permissions: [], status: 'active', type: 'rt-mr', user: 'u-1', tenant: 't-1', createdAt: '', updatedAt: '', ...overrides } as RoleEntity
}

function doctorFixture(overrides: Partial<DoctorEntity> = {}): DoctorEntity {
  return { id: 'doc-1', pharmaCode: 'DOC-1', name: 'Dr. Priya Sharma', specialization: 'cp', mobile: '9876543210', email: 'p@example.com', city: 'Pune', state: 'Maharashtra', pincode: '411001', googleMapLink: '', createdAt: '', updatedAt: '', ...overrides } as DoctorEntity
}

function bookCampResponseFixture(overrides: Partial<CampMutationResponseEntity> = {}): ApiResponse<CampMutationResponseEntity> {
  return {
    success: true,
    message: '',
    data: {
      id: 'camp-1', code: 'cmp-000001', tenant: 't-1', division: 'div-1', project: null,
      doctor: 'doc-1', type: 'screening', billingType: 'billable', patientExpectation: 0,
      fo: null, mr: null, date: '2026-09-15',
      timeSlot: '9am-1pm', city: 'Pune', state: 'Maharashtra',
      coordinates: [73.8567, 18.5204], devices: [], status: 'requested', stageHistory: [],
      createdAt: '', updatedAt: '', ...overrides,
    },
  } as ApiResponse<CampMutationResponseEntity>
}

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

const TEST_PROJECT: { id: string; name: string; campTimeSlots: CampTimeSlotValue[] } = { id: 'proj-1', name: 'Cardio Screening Drive', campTimeSlots: ['9am-1pm', '10am-2pm'] }

async function mockSession(roleId?: string) {
  const { useSession } = await import('@/hooks/useSession')
  vi.mocked(useSession).mockReturnValue({
    session: sessionFixture(roleId),
  } as unknown as ReturnType<typeof useSession>)
}

async function fillCommonFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/date/i), '2026-09-15')
  await user.click(screen.getByText(/select time slot/i))
  await user.click(await screen.findByText(/9 AM – 1 PM/i))
  await user.type(screen.getByLabelText(/city/i), 'Pune')
  await user.type(screen.getByLabelText(/state/i), 'Maharashtra')
  await user.type(screen.getByLabelText(/longitude/i), '73.8567')
  await user.type(screen.getByLabelText(/latitude/i), '18.5204')
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

describe('BookCampForm', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('renders only the project\'s own configured slots, not all 4', async () => {
    await mockSession()
    const BookCampForm = (await import('@/features/pharma/components/BookCampForm')).default

    const queryClient = makeQueryClient()
    const onBooked = vi.fn()

    render(
      <QueryClientProvider client={queryClient}>
        <BookCampForm needsMrPicker={false} project={TEST_PROJECT} onBooked={onBooked} />
      </QueryClientProvider>,
    )

    const user = userEvent.setup()
    await user.click(screen.getByText(/select time slot/i))

    expect(await screen.findByText(/9 AM – 1 PM/i)).toBeInTheDocument()
    expect(screen.getByText(/10 AM – 2 PM/i)).toBeInTheDocument()
    expect(screen.queryByText(/11 AM – 3 PM/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/6 PM – 10 PM/i)).not.toBeInTheDocument()
  })

  it('blocks booking and shows a clear message when the project has zero configured slots', async () => {
    await mockSession()
    const BookCampForm = (await import('@/features/pharma/components/BookCampForm')).default

    const queryClient = makeQueryClient()
    const onBooked = vi.fn()

    render(
      <QueryClientProvider client={queryClient}>
        <BookCampForm needsMrPicker={false} project={{ id: 'proj-2', name: 'Empty Project', campTimeSlots: [] }} onBooked={onBooked} />
      </QueryClientProvider>,
    )

    expect(screen.getByText(/no configured time slots/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /book camp/i })).not.toBeInTheDocument()
  })

  it('blocks submit with no MR selected when needsMrPicker is true, and never calls bookCamp', async () => {
    await mockSession()
    const { campsRealService } = await import('@/features/camps/campsReal.service')
    const BookCampForm = (await import('@/features/pharma/components/BookCampForm')).default

    const queryClient = makeQueryClient()
    const user = userEvent.setup()
    const onBooked = vi.fn()

    render(
      <QueryClientProvider client={queryClient}>
        <BookCampForm needsMrPicker project={TEST_PROJECT} onBooked={onBooked} />
      </QueryClientProvider>,
    )

    await pickDoctor(user)
    await fillCommonFields(user)

    await user.click(screen.getByRole('button', { name: /book camp/i }))

    await waitFor(() => expect(screen.getByText(/mr is required/i)).toBeInTheDocument())
    expect(campsRealService.bookCamp).not.toHaveBeenCalled()
  })

  it('submits the session\'s own role id as mr when needsMrPicker is false (MR booking for themselves)', async () => {
    await mockSession('self-role-42')
    const { campsRealService } = await import('@/features/camps/campsReal.service')
    const BookCampForm = (await import('@/features/pharma/components/BookCampForm')).default

    const queryClient = makeQueryClient()
    const user = userEvent.setup()
    const onBooked = vi.fn()

    render(
      <QueryClientProvider client={queryClient}>
        <BookCampForm needsMrPicker={false} project={TEST_PROJECT} onBooked={onBooked} />
      </QueryClientProvider>,
    )

    // No MR picker should even render for this role.
    expect(screen.queryByPlaceholderText(/search mr by name/i)).not.toBeInTheDocument()

    await pickDoctor(user)
    await fillCommonFields(user)

    await user.click(screen.getByRole('button', { name: /book camp/i }))

    await waitFor(() => expect(campsRealService.bookCamp).toHaveBeenCalledTimes(1))
    const payload = vi.mocked(campsRealService.bookCamp).mock.calls[0][0]
    expect(payload.mr).toBe('self-role-42')
    expect(payload.doctor).toBe('doc-1')
    // project is locked context, spliced in from the prop — never something
    // the user filled in — and no such field/input exists in the form at all.
    expect(payload.project).toBe(TEST_PROJECT.id)
    expect(screen.queryByRole('textbox', { name: /project/i })).not.toBeInTheDocument()
    expect(screen.getByText(TEST_PROJECT.name)).toBeInTheDocument()
  })

  it('submits the MR field when needsMrPicker is true and an MR is selected', async () => {
    await mockSession()
    const { campsRealService } = await import('@/features/camps/campsReal.service')
    const BookCampForm = (await import('@/features/pharma/components/BookCampForm')).default

    const queryClient = makeQueryClient()
    const user = userEvent.setup()
    const onBooked = vi.fn()

    render(
      <QueryClientProvider client={queryClient}>
        <BookCampForm needsMrPicker project={TEST_PROJECT} onBooked={onBooked} />
      </QueryClientProvider>,
    )

    await pickMr(user)
    await pickDoctor(user)
    await fillCommonFields(user)

    await user.click(screen.getByRole('button', { name: /book camp/i }))

    await waitFor(() => expect(campsRealService.bookCamp).toHaveBeenCalledTimes(1))
    const payload = vi.mocked(campsRealService.bookCamp).mock.calls[0][0]
    expect(payload.mr).toBe('mr-1')
  })

  it('submits patientExpectation as omitted when left blank, but preserves a genuine 0', async () => {
    await mockSession()
    const { campsRealService } = await import('@/features/camps/campsReal.service')
    const BookCampForm = (await import('@/features/pharma/components/BookCampForm')).default

    const queryClient = makeQueryClient()
    const user = userEvent.setup()
    const onBooked = vi.fn()

    render(
      <QueryClientProvider client={queryClient}>
        <BookCampForm needsMrPicker={false} project={TEST_PROJECT} onBooked={onBooked} />
      </QueryClientProvider>,
    )

    await pickDoctor(user)
    await fillCommonFields(user)
    // patientExpectation left blank entirely.

    await user.click(screen.getByRole('button', { name: /book camp/i }))

    await waitFor(() => expect(campsRealService.bookCamp).toHaveBeenCalledTimes(1))
    const payload = vi.mocked(campsRealService.bookCamp).mock.calls[0][0]
    expect(payload.patientExpectation).toBeUndefined()
  })

  it('preserves patientExpectation: 0 rather than treating it as blank', async () => {
    await mockSession()
    const { campsRealService } = await import('@/features/camps/campsReal.service')
    const BookCampForm = (await import('@/features/pharma/components/BookCampForm')).default

    const queryClient = makeQueryClient()
    const user = userEvent.setup()
    const onBooked = vi.fn()

    render(
      <QueryClientProvider client={queryClient}>
        <BookCampForm needsMrPicker={false} project={TEST_PROJECT} onBooked={onBooked} />
      </QueryClientProvider>,
    )

    await pickDoctor(user)
    await fillCommonFields(user)
    await user.type(screen.getByLabelText(/patients expected/i), '0')

    await user.click(screen.getByRole('button', { name: /book camp/i }))

    await waitFor(() => expect(campsRealService.bookCamp).toHaveBeenCalledTimes(1))
    const payload = vi.mocked(campsRealService.bookCamp).mock.calls[0][0]
    expect(payload.patientExpectation).toBe(0)
  })

  it('calls onBooked with the created camp on success, and resets the form — no in-place receipt', async () => {
    await mockSession()
    const BookCampForm = (await import('@/features/pharma/components/BookCampForm')).default

    const queryClient = makeQueryClient()
    const user = userEvent.setup()
    const onBooked = vi.fn()

    render(
      <QueryClientProvider client={queryClient}>
        <BookCampForm needsMrPicker={false} project={TEST_PROJECT} onBooked={onBooked} />
      </QueryClientProvider>,
    )

    await pickDoctor(user)
    await fillCommonFields(user)

    await user.click(screen.getByRole('button', { name: /book camp/i }))

    await waitFor(() => expect(onBooked).toHaveBeenCalledTimes(1))
    expect(onBooked.mock.calls[0][0].data.code).toBe('cmp-000001')
    // No receipt screen — the parent (the booking dialog) owns what happens
    // next; this component just resets and hands control back via onBooked.
    expect(screen.queryByText(/camp requested/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /book camp/i })).toBeInTheDocument()
  })

  it('disables the submit button while a booking is in flight, preventing a duplicate submit', async () => {
    await mockSession()
    const { campsRealService } = await import('@/features/camps/campsReal.service')
    let resolveBooking: (value: ApiResponse<CampMutationResponseEntity>) => void = () => {}
    vi.mocked(campsRealService.bookCamp).mockImplementation(
      () => new Promise((resolve) => { resolveBooking = resolve }),
    )

    const BookCampForm = (await import('@/features/pharma/components/BookCampForm')).default

    const queryClient = makeQueryClient()
    const user = userEvent.setup()
    const onBooked = vi.fn()

    render(
      <QueryClientProvider client={queryClient}>
        <BookCampForm needsMrPicker={false} project={TEST_PROJECT} onBooked={onBooked} />
      </QueryClientProvider>,
    )

    await pickDoctor(user)
    await fillCommonFields(user)

    const submitButton = screen.getByRole('button', { name: /book camp/i })
    await user.click(submitButton)

    await waitFor(() => expect(submitButton).toBeDisabled())

    // A second click while pending must not fire a second mutation call.
    await user.click(submitButton)
    expect(campsRealService.bookCamp).toHaveBeenCalledTimes(1)

    resolveBooking(bookCampResponseFixture())
    await waitFor(() => expect(onBooked).toHaveBeenCalledTimes(1))
  })

  it('blocks a true rapid double-submit — two submit events fired before React re-renders isPending — to exactly one mutation call', async () => {
    // parsePayload's async re-parse runs BEFORE isPending flips true, so a
    // disabled-button guard alone misses this race; submittingRef covers it.
    await mockSession()
    const { campsRealService } = await import('@/features/camps/campsReal.service')
    let resolveBooking: (value: ApiResponse<CampMutationResponseEntity>) => void = () => {}
    vi.mocked(campsRealService.bookCamp).mockImplementation(
      () => new Promise((resolve) => { resolveBooking = resolve }),
    )

    const BookCampForm = (await import('@/features/pharma/components/BookCampForm')).default

    const queryClient = makeQueryClient()
    const user = userEvent.setup()
    const onBooked = vi.fn()

    render(
      <QueryClientProvider client={queryClient}>
        <BookCampForm needsMrPicker={false} project={TEST_PROJECT} onBooked={onBooked} />
      </QueryClientProvider>,
    )

    await pickDoctor(user)
    await fillCommonFields(user)

    const form = screen.getByRole('button', { name: /book camp/i }).closest('form')
    if (!form) throw new Error('form not found')

    // No await between submits — fires before isPending/submittingRef can settle.
    fireEvent.submit(form)
    fireEvent.submit(form)

    await waitFor(() => expect(campsRealService.bookCamp).toHaveBeenCalled())
    expect(campsRealService.bookCamp).toHaveBeenCalledTimes(1)

    resolveBooking(bookCampResponseFixture())
    await waitFor(() => expect(onBooked).toHaveBeenCalledTimes(1))
  })
})
