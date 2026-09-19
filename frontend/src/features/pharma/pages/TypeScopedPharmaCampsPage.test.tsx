import { describe, it, expect, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import type { SessionResponse } from '@/types/accessManagement.types'
import type { ProjectEntity } from '@/types/project.types'
import type { CampEntity } from '@/types/campReal.types'

vi.mock('@/hooks/useSession')

// Mocks the map (needs real Google Maps creds) with a button firing the same onChange(LocationValue) contract.
vi.mock('@/components/widgets/location-picker/LocationPicker', () => ({
  default: ({ value, onChange }: { value: unknown; onChange: (v: unknown) => void }) => (
    <button
      type="button"
      onClick={() => onChange({ ...(value as object ?? {}), coordinates: [73.8567, 18.5204] })}
    >
      Set test coordinates
    </button>
  ),
}))

vi.mock('@/features/pharma/pharmaProjects.service', () => ({
  pharmaProjectsService: {
    getProject: vi.fn(),
    searchScopedProjects: vi.fn(),
  },
}))

vi.mock('@/features/pharma/pharmaCamps.service', () => ({
  pharmaCampsService: {
    searchScopedCamps: vi.fn(),
  },
}))

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

// dayKey (local YYYY-MM-DD) of "today", matching how the availability grid
// derives its own default fetch window.
function todayKey(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

vi.mock('@/features/camps/campsReal.service', () => ({
  campsRealService: {
    bookCamp: vi.fn(async () => ({ success: true, message: '', data: { id: 'camp-new', code: 'cmp-000002' } })),
    getBookingAvailability: vi.fn(async () => ({
      success: true,
      message: '',
      data: {
        eligibleFoCount: 1,
        dateFrom: todayKey(),
        dateTo: todayKey(),
        dates: {
          [todayKey()]: {
            available: true,
            slots: { '9am-1pm': true, '10am-2pm': true, '11am-3pm': true, '6pm-10pm': true },
          },
        },
      },
    })),
  },
}))

function sessionFixture(roleTypeCode: string): SessionResponse {
  return {
    user: { id: 'u-1', email: 'a@example.com', firstName: 'a', lastName: 'b' },
    role: { id: 'role-1', code: 'role-code', name: 'Role' },
    roleType: { id: 'rt-1', code: roleTypeCode, name: roleTypeCode },
    tenant: { id: 't-1', code: 'tenant-1', name: 'Tenant', type: 'customer' },
    permissions: ['camp:book'],
  } as unknown as SessionResponse
}

function projectFixture(overrides: Partial<ProjectEntity> = {}): ProjectEntity {
  return {
    id: 'proj-1', code: 'PRJ-1', name: 'Cardio Screening Drive', tenant: 't-1', division: 'div-1',
    therapy: 'cardiology', type: ['screening_camp', 'diet'], tests: [], lead: null, mode: null, campCost: 0, totalCamps: 0,
    gst: 0, valueBeforeGST: 0, additionalCost: 0, campTimeSlots: ['9am-1pm', '10am-2pm'], freeCancelHours: 0,
    cancellationAllowed: 0, campCostDeductionOnChargableCancel: 0, goLiveScope: null,
    whoCanBookCamp: [], salesRep: null, projectCoordinator: null, status: 'live',
    createdAt: '', updatedAt: '', ...overrides,
  } as unknown as ProjectEntity
}

function campFixture(overrides: Partial<CampEntity> = {}): CampEntity {
  return {
    id: 'camp-1', code: 'cmp-000001', tenant: 't-1', division: 'div-1', project: 'proj-1',
    doctor: 'doc-1', type: 'screening', billingType: 'billable', patientExpectation: 0,
    fo: null, mr: null, date: '2026-09-15',
    timeSlot: '9am-1pm',
    location: {
      addressLine1: '221 Baker Street', city: 'Pune', state: 'Maharashtra',
      pincode: '411001', coordinates: [73.8567, 18.5204],
    },
    devices: [], status: 'requested', stageHistory: [],
    createdAt: '', updatedAt: '', ...overrides,
  } as CampEntity
}

// Matches production's 5-minute staleTime (queryClient.ts) — a 0 default
// would refetch on remount regardless of invalidation, masking the cache bug.
function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 5 * 60 * 1000 } } })
}

// Drives BookCampForm's 3-step wizard to submission — identical across Screening/Diet.
async function fillAndSubmitBookCampForm(user: ReturnType<typeof userEvent.setup>, doctorName: string) {
  // Step 1 — who.
  await user.type(screen.getByPlaceholderText(/search doctor by name/i), doctorName.split(' ')[0])
  const doctorOption = await screen.findByText(new RegExp(doctorName.replace('.', '\\.'), 'i'), {}, { timeout: 3000 })
  await user.click(doctorOption)
  await user.click(screen.getByRole('button', { name: /^next$/i }))

  // Step 2 — where.
  await user.type(await screen.findByLabelText(/^address line 1$/i), '221 Baker Street')
  await user.type(screen.getByLabelText(/^city$/i), 'Pune')
  await user.type(screen.getByLabelText(/^state$/i), 'Maharashtra')
  await user.type(screen.getByLabelText(/^pincode$/i), '411001')
  await user.click(screen.getByRole('button', { name: /set test coordinates/i }))
  await user.click(screen.getByRole('button', { name: /^next$/i }))

  // Step 3 — when & details: today is the only mocked-available day.
  const today = new Date()
  const todayCell = await screen.findByRole('gridcell', { name: String(today.getDate()) })
  await user.click(todayCell.querySelector('button')!)
  await user.click(await screen.findByRole('button', { name: /9 AM – 1 PM/i }))

  await user.click(screen.getByRole('button', { name: /^book camp$/i }))
}

async function renderScreeningPage(projectId = 'proj-1') {
  const PharmaScreeningCampsPage = (await import('@/features/pharma/pages/PharmaScreeningCampsPage')).default
  const queryClient = makeQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/pharma/projects/${projectId}/camps/screening`]}>
        <Routes>
          <Route path="/pharma/projects/:id/camps/screening" element={<PharmaScreeningCampsPage />} />
          <Route path="/pharma/rsm" element={<div>RSM Portal Page</div>} />
          <Route path="/pharma/projects/:id/camps" element={<div>All camps page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

// Mounts the REAL Screening and Diet pages so cross-navigation lands on Diet's own empty-state text.
async function renderScreeningAndDietPages(projectId = 'proj-1') {
  const PharmaScreeningCampsPage = (await import('@/features/pharma/pages/PharmaScreeningCampsPage')).default
  const PharmaDietCampsPage = (await import('@/features/pharma/pages/PharmaDietCampsPage')).default
  const queryClient = makeQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/pharma/projects/${projectId}/camps/screening`]}>
        <Routes>
          <Route path="/pharma/projects/:id/camps/screening" element={<PharmaScreeningCampsPage />} />
          <Route path="/pharma/projects/:id/camps/diet" element={<PharmaDietCampsPage />} />
          <Route path="/pharma/rsm" element={<div>RSM Portal Page</div>} />
          <Route path="/pharma/projects/:id/camps" element={<div>All camps page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

// Mounts the REAL Screening and All-camps pages to prove booking on one invalidates the other's cache too.
async function renderScreeningAndAllCampsPages(projectId = 'proj-1') {
  const PharmaScreeningCampsPage = (await import('@/features/pharma/pages/PharmaScreeningCampsPage')).default
  const PharmaProjectCampsPage = (await import('@/features/pharma/pages/PharmaProjectCampsPage')).default
  const queryClient = makeQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/pharma/projects/${projectId}/camps/screening`]}>
        <Routes>
          <Route path="/pharma/projects/:id/camps/screening" element={<PharmaScreeningCampsPage />} />
          <Route path="/pharma/projects/:id/camps" element={<PharmaProjectCampsPage />} />
          <Route path="/pharma/rsm" element={<div>RSM Portal Page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

async function renderDietPage(projectId = 'proj-1') {
  const PharmaDietCampsPage = (await import('@/features/pharma/pages/PharmaDietCampsPage')).default
  const queryClient = makeQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/pharma/projects/${projectId}/camps/diet`]}>
        <Routes>
          <Route path="/pharma/projects/:id/camps/diet" element={<PharmaDietCampsPage />} />
          <Route path="/pharma/rsm" element={<div>RSM Portal Page</div>} />
          <Route path="/pharma/projects/:id/camps" element={<div>All camps page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('PharmaScreeningCampsPage / PharmaDietCampsPage — separate routes, shared TypeScopedPharmaCampsPage body', () => {
  it('Screening page queries camps scoped to type=screening only', async () => {
    const { useSession } = await import('@/hooks/useSession')
    vi.mocked(useSession).mockReturnValue({
      isSettled: true, isConfirmedUnauthenticated: false, session: sessionFixture('pharma-rsm'), hasPermission: () => false,
    } as unknown as ReturnType<typeof useSession>)

    const { pharmaProjectsService } = await import('@/features/pharma/pharmaProjects.service')
    const { pharmaCampsService } = await import('@/features/pharma/pharmaCamps.service')
    vi.mocked(pharmaProjectsService.getProject).mockResolvedValue({ success: true, message: '', data: projectFixture() })
    vi.mocked(pharmaCampsService.searchScopedCamps).mockResolvedValue({ success: true, message: '', data: { items: [], count: 0 } })

    await renderScreeningPage()

    expect(await screen.findByText(/no screening camps assigned to you on this project yet/i)).toBeInTheDocument()
    await waitFor(() => expect(pharmaCampsService.searchScopedCamps).toHaveBeenCalledWith(
      expect.objectContaining({ project: 'proj-1', type: 'screening' }),
    ))
  })

  it('Diet page queries camps scoped to type=diet only — a genuinely separate route, not a tab', async () => {
    const { useSession } = await import('@/hooks/useSession')
    vi.mocked(useSession).mockReturnValue({
      isSettled: true, isConfirmedUnauthenticated: false, session: sessionFixture('pharma-rsm'), hasPermission: () => false,
    } as unknown as ReturnType<typeof useSession>)

    const { pharmaProjectsService } = await import('@/features/pharma/pharmaProjects.service')
    const { pharmaCampsService } = await import('@/features/pharma/pharmaCamps.service')
    vi.mocked(pharmaProjectsService.getProject).mockResolvedValue({ success: true, message: '', data: projectFixture() })
    vi.mocked(pharmaCampsService.searchScopedCamps).mockResolvedValue({ success: true, message: '', data: { items: [], count: 0 } })

    await renderDietPage()

    expect(await screen.findByText(/no diet camps assigned to you on this project yet/i)).toBeInTheDocument()
    await waitFor(() => expect(pharmaCampsService.searchScopedCamps).toHaveBeenCalledWith(
      expect.objectContaining({ project: 'proj-1', type: 'diet' }),
    ))
  })

  it('the Screening page shows Diet camps ALREADY on the project too — viewing is never restricted by the project\'s configured type, only booking is', async () => {
    const { useSession } = await import('@/hooks/useSession')
    vi.mocked(useSession).mockReturnValue({
      isSettled: true, isConfirmedUnauthenticated: false, session: sessionFixture('pharma-rsm'), hasPermission: () => false,
    } as unknown as ReturnType<typeof useSession>)

    const { pharmaProjectsService } = await import('@/features/pharma/pharmaProjects.service')
    const { pharmaCampsService } = await import('@/features/pharma/pharmaCamps.service')
    // A Diet-only project with a pre-existing Screening camp — must still show since the backend doesn't enforce the match.
    vi.mocked(pharmaProjectsService.getProject).mockResolvedValue({ success: true, message: '', data: projectFixture({ type: ['diet'] }) })
    vi.mocked(pharmaCampsService.searchScopedCamps).mockResolvedValue({
      success: true, message: '', data: { items: [campFixture({ type: 'screening' })], count: 1 },
    })

    await renderScreeningPage()

    expect(await screen.findByText('cmp-000001')).toBeInTheDocument()
  })

  it('booking is disabled on the Screening page when the project isn\'t configured for screening camps, with a clear reason', async () => {
    const { useSession } = await import('@/hooks/useSession')
    vi.mocked(useSession).mockReturnValue({
      isSettled: true, isConfirmedUnauthenticated: false, session: sessionFixture('pharma-mr'), hasPermission: () => false,
    } as unknown as ReturnType<typeof useSession>)

    const { pharmaProjectsService } = await import('@/features/pharma/pharmaProjects.service')
    const { pharmaCampsService } = await import('@/features/pharma/pharmaCamps.service')
    vi.mocked(pharmaProjectsService.getProject).mockResolvedValue({ success: true, message: '', data: projectFixture({ type: ['diet'] }) })
    vi.mocked(pharmaCampsService.searchScopedCamps).mockResolvedValue({ success: true, message: '', data: { items: [], count: 0 } })

    await renderScreeningPage()

    await screen.findByText('Cardio Screening Drive')
    expect(screen.getByRole('button', { name: /new camp/i })).toBeDisabled()
    expect(screen.getByText(/isn't configured for screening camps/i)).toBeInTheDocument()
  })

  it('the cross-navigation row on Screening shows Diet and All camps as clickable links, and Screening itself as plain (non-clickable) text', async () => {
    const { useSession } = await import('@/hooks/useSession')
    vi.mocked(useSession).mockReturnValue({
      isSettled: true, isConfirmedUnauthenticated: false, session: sessionFixture('pharma-rsm'), hasPermission: () => false,
    } as unknown as ReturnType<typeof useSession>)

    const { pharmaProjectsService } = await import('@/features/pharma/pharmaProjects.service')
    const { pharmaCampsService } = await import('@/features/pharma/pharmaCamps.service')
    vi.mocked(pharmaProjectsService.getProject).mockResolvedValue({ success: true, message: '', data: projectFixture({ type: ['screening_camp', 'diet'] }) })
    vi.mocked(pharmaCampsService.searchScopedCamps).mockResolvedValue({ success: true, message: '', data: { items: [], count: 0 } })

    await renderScreeningPage()
    await screen.findByText(/no screening camps assigned to you on this project yet/i)

    expect(screen.queryByRole('button', { name: /^screening$/i })).not.toBeInTheDocument()
    expect(screen.getByText('Screening')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^diet$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /all camps/i })).toBeInTheDocument()
  })

  it('clicking Diet from the Screening page navigates directly to Diet for the SAME project — no detour through "Your projects"', async () => {
    const { useSession } = await import('@/hooks/useSession')
    vi.mocked(useSession).mockReturnValue({
      isSettled: true, isConfirmedUnauthenticated: false, session: sessionFixture('pharma-rsm'), hasPermission: () => false,
    } as unknown as ReturnType<typeof useSession>)

    const { pharmaProjectsService } = await import('@/features/pharma/pharmaProjects.service')
    const { pharmaCampsService } = await import('@/features/pharma/pharmaCamps.service')
    vi.mocked(pharmaProjectsService.getProject).mockResolvedValue({ success: true, message: '', data: projectFixture({ type: ['screening_camp', 'diet'] }) })
    vi.mocked(pharmaCampsService.searchScopedCamps).mockResolvedValue({ success: true, message: '', data: { items: [], count: 0 } })

    const user = userEvent.setup()
    await renderScreeningAndDietPages()
    await screen.findByText(/no screening camps assigned to you on this project yet/i)

    await user.click(screen.getByRole('button', { name: /^diet$/i }))

    expect(await screen.findByText(/no diet camps assigned to you on this project yet/i)).toBeInTheDocument()
  })

  it('a screening-only project shows no Diet link at all — only Screening (plain text) and All camps', async () => {
    const { useSession } = await import('@/hooks/useSession')
    vi.mocked(useSession).mockReturnValue({
      isSettled: true, isConfirmedUnauthenticated: false, session: sessionFixture('pharma-rsm'), hasPermission: () => false,
    } as unknown as ReturnType<typeof useSession>)

    const { pharmaProjectsService } = await import('@/features/pharma/pharmaProjects.service')
    const { pharmaCampsService } = await import('@/features/pharma/pharmaCamps.service')
    vi.mocked(pharmaProjectsService.getProject).mockResolvedValue({ success: true, message: '', data: projectFixture({ type: ['screening_camp'] }) })
    vi.mocked(pharmaCampsService.searchScopedCamps).mockResolvedValue({ success: true, message: '', data: { items: [], count: 0 } })

    await renderScreeningPage()
    await screen.findByText(/no screening camps assigned to you on this project yet/i)

    expect(screen.queryByText('Diet')).not.toBeInTheDocument()
    expect(screen.getByText('Screening')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /all camps/i })).toBeInTheDocument()
  })

  it('"All camps" link navigates to the unrestricted All-camps page', async () => {
    const { useSession } = await import('@/hooks/useSession')
    vi.mocked(useSession).mockReturnValue({
      isSettled: true, isConfirmedUnauthenticated: false, session: sessionFixture('pharma-rsm'), hasPermission: () => false,
    } as unknown as ReturnType<typeof useSession>)

    const { pharmaProjectsService } = await import('@/features/pharma/pharmaProjects.service')
    const { pharmaCampsService } = await import('@/features/pharma/pharmaCamps.service')
    vi.mocked(pharmaProjectsService.getProject).mockResolvedValue({ success: true, message: '', data: projectFixture() })
    vi.mocked(pharmaCampsService.searchScopedCamps).mockResolvedValue({ success: true, message: '', data: { items: [], count: 0 } })

    const user = userEvent.setup()
    await renderScreeningPage()
    await screen.findByText(/no screening camps assigned to you on this project yet/i)

    await user.click(screen.getByRole('button', { name: /all camps/i }))

    expect(await screen.findByText('All camps page')).toBeInTheDocument()
  })

  it('"Back to projects" carries ?preferType=screening so picking a different project stays on Screening', async () => {
    const { useSession } = await import('@/hooks/useSession')
    vi.mocked(useSession).mockReturnValue({
      isSettled: true, isConfirmedUnauthenticated: false, session: sessionFixture('pharma-rsm'), hasPermission: () => false,
    } as unknown as ReturnType<typeof useSession>)

    const { pharmaProjectsService } = await import('@/features/pharma/pharmaProjects.service')
    const { pharmaCampsService } = await import('@/features/pharma/pharmaCamps.service')
    vi.mocked(pharmaProjectsService.getProject).mockResolvedValue({ success: true, message: '', data: projectFixture() })
    vi.mocked(pharmaCampsService.searchScopedCamps).mockResolvedValue({ success: true, message: '', data: { items: [], count: 0 } })

    const user = userEvent.setup()
    await renderScreeningPage()
    await screen.findByText(/no screening camps assigned to you on this project yet/i)

    await user.click(screen.getByRole('button', { name: /back to projects/i }))

    // preferType consumption itself is covered by PharmaProjectsPage.test.tsx.
    expect(await screen.findByText('RSM Portal Page')).toBeInTheDocument()
  })

  it('post-booking on Diet: closes the dialog and shows the newly booked camp in the refreshed list', async () => {
    const { useSession } = await import('@/hooks/useSession')
    vi.mocked(useSession).mockReturnValue({
      isSettled: true, isConfirmedUnauthenticated: false, session: sessionFixture('pharma-mr'), hasPermission: () => false,
    } as unknown as ReturnType<typeof useSession>)

    const { pharmaProjectsService } = await import('@/features/pharma/pharmaProjects.service')
    const { pharmaCampsService } = await import('@/features/pharma/pharmaCamps.service')
    const { doctorsService } = await import('@/features/doctors/doctors.service')
    const { campsRealService } = await import('@/features/camps/campsReal.service')

    vi.mocked(pharmaProjectsService.getProject).mockResolvedValue({ success: true, message: '', data: projectFixture() })
    // A mutable flag, not a fixed once-queue: the exact number of refetches this query gets isn't a safe assumption.
    let booked = false
    vi.mocked(pharmaCampsService.searchScopedCamps).mockImplementation(async () => ({
      success: true,
      message: '',
      data: booked
        ? { items: [campFixture({ code: 'cmp-000002', type: 'diet' })], count: 1 }
        : { items: [], count: 0 },
    }))
    vi.mocked(doctorsService.searchDoctors).mockResolvedValue({
      success: true, message: '', data: { items: [{ id: 'doc-1', pharmaCode: 'DOC-1', name: 'Dr. Priya Sharma', specialization: 'cp', mobile: '9876543210', email: 'p@example.com', city: 'Pune', state: 'Maharashtra', pincode: '411001', googleMapLink: '', createdAt: '', updatedAt: '' } as never], count: 1 },
    })
    vi.mocked(campsRealService.bookCamp).mockImplementationOnce(async () => {
      booked = true
      return { success: true, message: '', data: { id: 'camp-new', code: 'cmp-000002' } } as never
    })

    const user = userEvent.setup()
    await renderDietPage()
    await screen.findByText(/no diet camps assigned to you on this project yet/i)

    await user.click(screen.getByRole('button', { name: /new camp/i }))
    await screen.findByText(/booking for project/i)
    expect(screen.getByText(/new diet camp/i)).toBeInTheDocument()
    expect(screen.queryByText(/camp type/i)).not.toBeInTheDocument()

    await fillAndSubmitBookCampForm(user, 'Dr. Priya Sharma')

    await waitFor(() => expect(campsRealService.bookCamp).toHaveBeenCalled())
    expect(vi.mocked(campsRealService.bookCamp).mock.lastCall?.[0].type).toBe('diet')
    expect(vi.mocked(campsRealService.bookCamp).mock.lastCall?.[0].project).toBe('proj-1')

    await waitFor(() => expect(screen.queryByText(/booking for project/i)).not.toBeInTheDocument())
    expect(await screen.findByText('cmp-000002')).toBeInTheDocument()
  })

  it('booking on Screening invalidates the All-camps page\'s cache too — navigating there afterward shows the fresh list, not a stale pre-booking snapshot', async () => {
    const { useSession } = await import('@/hooks/useSession')
    vi.mocked(useSession).mockReturnValue({
      isSettled: true, isConfirmedUnauthenticated: false, session: sessionFixture('pharma-mr'), hasPermission: () => false,
    } as unknown as ReturnType<typeof useSession>)

    const { pharmaProjectsService } = await import('@/features/pharma/pharmaProjects.service')
    const { pharmaCampsService } = await import('@/features/pharma/pharmaCamps.service')
    const { doctorsService } = await import('@/features/doctors/doctors.service')
    const { campsRealService } = await import('@/features/camps/campsReal.service')

    vi.mocked(pharmaProjectsService.getProject).mockResolvedValue({ success: true, message: '', data: projectFixture() })
    vi.mocked(doctorsService.searchDoctors).mockResolvedValue({
      success: true, message: '', data: { items: [{ id: 'doc-1', pharmaCode: 'DOC-1', name: 'Dr. Priya Sharma', specialization: 'cp', mobile: '9876543210', email: 'p@example.com', city: 'Pune', state: 'Maharashtra', pincode: '411001', googleMapLink: '', createdAt: '', updatedAt: '' } as never], count: 1 },
    })
    // A mutable flag, not a fixed once-queue: the invalidation under test also
    // refetches Screening's own query, one more call than a fixed sequence predicts.
    let booked = false
    vi.mocked(pharmaCampsService.searchScopedCamps).mockImplementation(async () => ({
      success: true,
      message: '',
      data: booked
        ? { items: [campFixture({ code: 'cmp-pre-existing', type: 'screening' }), campFixture({ id: 'camp-new', code: 'cmp-000002', type: 'screening' })], count: 2 }
        : { items: [campFixture({ code: 'cmp-pre-existing', type: 'screening' })], count: 1 },
    }))
    vi.mocked(campsRealService.bookCamp).mockImplementation(async () => {
      booked = true
      return { success: true, message: '', data: { id: 'camp-new', code: 'cmp-000002' } } as never
    })

    const user = userEvent.setup()
    await renderScreeningAndAllCampsPages()
    await screen.findByText('cmp-pre-existing')

    // Visit All-camps once BEFORE booking — this caches its (1-item) query.
    await user.click(screen.getByRole('button', { name: /all camps/i }))
    expect(await screen.findByText('cmp-pre-existing')).toBeInTheDocument()
    expect(screen.queryByText('cmp-000002')).not.toBeInTheDocument()

    // Back to Screening to book a new camp.
    await user.click(screen.getByRole('button', { name: /^screening$/i }))
    await screen.findByText('cmp-pre-existing')

    await user.click(screen.getByRole('button', { name: /new camp/i }))
    await screen.findByText(/booking for project/i)
    await fillAndSubmitBookCampForm(user, 'Dr. Priya Sharma')
    await waitFor(() => expect(campsRealService.bookCamp).toHaveBeenCalled())
    await waitFor(() => expect(screen.queryByText(/booking for project/i)).not.toBeInTheDocument())

    // Return to All-camps — without the fix (narrow invalidation), this would
    // still show only the stale 1-item snapshot from the earlier visit.
    await user.click(screen.getByRole('button', { name: /all camps/i }))
    expect(await screen.findByText('cmp-000002')).toBeInTheDocument()
    expect(screen.getByText('cmp-pre-existing')).toBeInTheDocument()
  })
})
