import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { RoleEntity } from '@/types/accessManagement.types'
import type { DoctorEntity } from '@/types/doctor.types'
import type { ApiResponse } from '@/types/common.types'
import type { CampEntity } from '@/types/campReal.types'

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

function mrFixture(overrides: Partial<RoleEntity> = {}): RoleEntity {
  return { id: 'mr-1', code: 'phr-000001', name: 'Cardio MR Mona', permissions: [], status: 'active', type: 'rt-mr', user: 'u-1', tenant: 't-1', createdAt: '', updatedAt: '', ...overrides } as RoleEntity
}

function doctorFixture(overrides: Partial<DoctorEntity> = {}): DoctorEntity {
  return { id: 'doc-1', pharmaCode: 'DOC-1', name: 'Dr. Priya Sharma', specialization: 'cp', mobile: '9876543210', email: 'p@example.com', city: 'Pune', state: 'Maharashtra', pincode: '411001', googleMapLink: '', createdAt: '', updatedAt: '', ...overrides } as DoctorEntity
}

function bookCampResponseFixture(overrides: Partial<CampEntity> = {}): ApiResponse<CampEntity> {
  return {
    success: true,
    message: '',
    data: {
      id: 'camp-1', code: 'cmp-000001', tenant: 't-1', division: 'div-1', project: null,
      doctor: 'doc-1', type: 'screening', billingType: 'billable', patientExpectation: 0,
      fo: null, mr: null, asm: null, rsm: null, date: '2026-09-15',
      timeSlot: { start: '10:00', end: '13:00' }, city: 'Pune', state: 'Maharashtra',
      coordinates: [73.8567, 18.5204], devices: [], status: 'requested', stageHistory: [],
      createdAt: '', updatedAt: '', ...overrides,
    },
  } as ApiResponse<CampEntity>
}

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

async function fillCommonFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/date/i), '2026-09-15')
  await user.type(screen.getByLabelText(/start time/i), '10:00')
  await user.type(screen.getByLabelText(/end time/i), '13:00')
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

  it('blocks submit with no MR selected when needsMrPicker is true, and never calls bookCamp', async () => {
    const { campsRealService } = await import('@/features/camps/campsReal.service')
    const BookCampForm = (await import('@/features/pharma/components/BookCampForm')).default

    const queryClient = makeQueryClient()
    const user = userEvent.setup()

    render(
      <QueryClientProvider client={queryClient}>
        <BookCampForm needsMrPicker />
      </QueryClientProvider>,
    )

    await pickDoctor(user)
    await fillCommonFields(user)

    await user.click(screen.getByRole('button', { name: /book camp/i }))

    await waitFor(() => expect(screen.getByText(/mr is required/i)).toBeInTheDocument())
    expect(campsRealService.bookCamp).not.toHaveBeenCalled()
  })

  it('submits without an mr field when needsMrPicker is false (MR booking for themselves)', async () => {
    const { campsRealService } = await import('@/features/camps/campsReal.service')
    const BookCampForm = (await import('@/features/pharma/components/BookCampForm')).default

    const queryClient = makeQueryClient()
    const user = userEvent.setup()

    render(
      <QueryClientProvider client={queryClient}>
        <BookCampForm needsMrPicker={false} />
      </QueryClientProvider>,
    )

    // No MR picker should even render for this role.
    expect(screen.queryByPlaceholderText(/search mr by name/i)).not.toBeInTheDocument()

    await pickDoctor(user)
    await fillCommonFields(user)

    await user.click(screen.getByRole('button', { name: /book camp/i }))

    await waitFor(() => expect(campsRealService.bookCamp).toHaveBeenCalledTimes(1))
    const payload = vi.mocked(campsRealService.bookCamp).mock.calls[0][0]
    // undefined, not a real id — JSON.stringify drops it from the actual
    // wire request, so the backend never sees an `mr` key at all.
    expect(payload.mr).toBeUndefined()
    expect(payload.doctor).toBe('doc-1')
  })

  it('submits the MR field when needsMrPicker is true and an MR is selected', async () => {
    const { campsRealService } = await import('@/features/camps/campsReal.service')
    const BookCampForm = (await import('@/features/pharma/components/BookCampForm')).default

    const queryClient = makeQueryClient()
    const user = userEvent.setup()

    render(
      <QueryClientProvider client={queryClient}>
        <BookCampForm needsMrPicker />
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
    const { campsRealService } = await import('@/features/camps/campsReal.service')
    const BookCampForm = (await import('@/features/pharma/components/BookCampForm')).default

    const queryClient = makeQueryClient()
    const user = userEvent.setup()

    render(
      <QueryClientProvider client={queryClient}>
        <BookCampForm needsMrPicker={false} />
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
    const { campsRealService } = await import('@/features/camps/campsReal.service')
    const BookCampForm = (await import('@/features/pharma/components/BookCampForm')).default

    const queryClient = makeQueryClient()
    const user = userEvent.setup()

    render(
      <QueryClientProvider client={queryClient}>
        <BookCampForm needsMrPicker={false} />
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

  it('shows a success receipt with the real camp code on success, and does not navigate away', async () => {
    const BookCampForm = (await import('@/features/pharma/components/BookCampForm')).default

    const queryClient = makeQueryClient()
    const user = userEvent.setup()

    render(
      <QueryClientProvider client={queryClient}>
        <BookCampForm needsMrPicker={false} />
      </QueryClientProvider>,
    )

    await pickDoctor(user)
    await fillCommonFields(user)

    await user.click(screen.getByRole('button', { name: /book camp/i }))

    expect(await screen.findByText(/camp requested/i)).toBeInTheDocument()
    expect(await screen.findByText('cmp-000001')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /book another camp/i })).toBeInTheDocument()
  })

  it('disables the submit button while a booking is in flight, preventing a duplicate submit', async () => {
    const { campsRealService } = await import('@/features/camps/campsReal.service')
    let resolveBooking: (value: ApiResponse<CampEntity>) => void = () => {}
    vi.mocked(campsRealService.bookCamp).mockImplementation(
      () => new Promise((resolve) => { resolveBooking = resolve }),
    )

    const BookCampForm = (await import('@/features/pharma/components/BookCampForm')).default

    const queryClient = makeQueryClient()
    const user = userEvent.setup()

    render(
      <QueryClientProvider client={queryClient}>
        <BookCampForm needsMrPicker={false} />
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
    expect(await screen.findByText(/camp requested/i)).toBeInTheDocument()
  })

  it('blocks a true rapid double-submit — two submit events fired before React re-renders isPending — to exactly one mutation call', async () => {
    // parsePayload's own async Zod re-parse runs BEFORE bookCamp.isPending
    // ever flips true, so a guard that only relies on the disabled button
    // (the previous test) doesn't cover the real race: two submits fired
    // back-to-back, with no await/waitFor letting React re-render in
    // between, must still only reach the mutation once. This is what the
    // synchronous submittingRef guard in BookCampForm exists for.
    const { campsRealService } = await import('@/features/camps/campsReal.service')
    let resolveBooking: (value: ApiResponse<CampEntity>) => void = () => {}
    vi.mocked(campsRealService.bookCamp).mockImplementation(
      () => new Promise((resolve) => { resolveBooking = resolve }),
    )

    const BookCampForm = (await import('@/features/pharma/components/BookCampForm')).default

    const queryClient = makeQueryClient()
    const user = userEvent.setup()

    render(
      <QueryClientProvider client={queryClient}>
        <BookCampForm needsMrPicker={false} />
      </QueryClientProvider>,
    )

    await pickDoctor(user)
    await fillCommonFields(user)

    const form = screen.getByRole('button', { name: /book camp/i }).closest('form')
    if (!form) throw new Error('form not found')

    // Two submit events, no await between them — fires before isPending (or
    // even submittingRef, on the very first) has had any chance to settle
    // from the first call's own microtask queue.
    fireEvent.submit(form)
    fireEvent.submit(form)

    await waitFor(() => expect(campsRealService.bookCamp).toHaveBeenCalled())
    expect(campsRealService.bookCamp).toHaveBeenCalledTimes(1)

    resolveBooking(bookCampResponseFixture())
    expect(await screen.findByText(/camp requested/i)).toBeInTheDocument()
  })
})
