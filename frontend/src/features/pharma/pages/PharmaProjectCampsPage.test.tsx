import { describe, it, expect, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import type { SessionResponse } from '@/types/accessManagement.types'
import type { ProjectEntity } from '@/types/project.types'
import type { CampEntity } from '@/types/campReal.types'

vi.mock('@/hooks/useSession')

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

vi.mock('@/features/camps/campsReal.service', () => ({
  campsRealService: {
    bookCamp: vi.fn(async () => ({ success: true, message: '', data: { id: 'camp-new', code: 'cmp-000002' } })),
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
    therapy: 'cardiology', type: [], tests: [], lead: null, mode: null, campCost: 0, totalCamps: 0,
    gst: 0, valueBeforeGST: 0, additionalCost: 0, campTimeSlots: [], freeCancelHours: 0,
    cancellationAllowed: 0, campCostDeductionOnChargableCancel: 0, goLiveScope: null,
    whoCanBookCamp: [], salesRep: null, projectCoordinator: null, status: 'live',
    createdAt: '', updatedAt: '', ...overrides,
  } as unknown as ProjectEntity
}

function campFixture(overrides: Partial<CampEntity> = {}): CampEntity {
  return {
    id: 'camp-1', code: 'cmp-000001', tenant: 't-1', division: 'div-1', project: 'proj-1',
    doctor: 'doc-1', type: 'screening', billingType: 'billable', patientExpectation: 0,
    fo: null, mr: null, asm: null, rsm: null, date: '2026-09-15',
    timeSlot: { start: '10:00', end: '13:00' }, city: 'Pune', state: 'Maharashtra',
    coordinates: [73.8567, 18.5204], devices: [], status: 'requested', stageHistory: [],
    createdAt: '', updatedAt: '', ...overrides,
  } as CampEntity
}

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

async function renderPage(projectId = 'proj-1') {
  const PharmaProjectCampsPage = (await import('@/features/pharma/pages/PharmaProjectCampsPage')).default
  const queryClient = makeQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/pharma/projects/${projectId}/camps`]}>
        <Routes>
          <Route path="/pharma/projects/:id/camps" element={<PharmaProjectCampsPage />} />
          <Route path="/pharma/rsm" element={<div>RSM Portal Page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('PharmaProjectCampsPage', () => {
  it('blocks a camp:book-holding but non-pharma role type from the real deep-linked page — neither project nor camps ever fetch', async () => {
    // Renders the REAL page (not just the gate in isolation) to prove the
    // gate/content split actually prevents the data hooks' requests from firing for this session.
    const { useSession } = await import('@/hooks/useSession')
    vi.mocked(useSession).mockReturnValue({
      isSettled: true, isConfirmedUnauthenticated: false, session: sessionFixture('some-other-custom-role'),
    } as unknown as ReturnType<typeof useSession>)

    const { pharmaProjectsService } = await import('@/features/pharma/pharmaProjects.service')
    const { pharmaCampsService } = await import('@/features/pharma/pharmaCamps.service')

    await renderPage()

    expect(await screen.findByText(/not available for your role/i)).toBeInTheDocument()
    expect(pharmaProjectsService.getProject).not.toHaveBeenCalled()
    expect(pharmaCampsService.searchScopedCamps).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: /new camp/i })).not.toBeInTheDocument()
  })

  it('never fetches camps and never renders "New camp" when the project is inaccessible (404)', async () => {
    const { useSession } = await import('@/hooks/useSession')
    vi.mocked(useSession).mockReturnValue({
      isSettled: true, isConfirmedUnauthenticated: false, session: sessionFixture('pharma-rsm'),
    } as unknown as ReturnType<typeof useSession>)

    const { pharmaProjectsService } = await import('@/features/pharma/pharmaProjects.service')
    const { pharmaCampsService } = await import('@/features/pharma/pharmaCamps.service')
    vi.mocked(pharmaProjectsService.getProject).mockRejectedValue(new Error('Not found'))

    await renderPage()

    await waitFor(() => expect(screen.getByText(/not found, or you don't have access/i)).toBeInTheDocument())

    expect(pharmaCampsService.searchScopedCamps).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: /new camp/i })).not.toBeInTheDocument()
  })

  it('RSM/ASM/MR empty state never claims the whole project has no camps', async () => {
    const { useSession } = await import('@/hooks/useSession')
    vi.mocked(useSession).mockReturnValue({
      isSettled: true, isConfirmedUnauthenticated: false, session: sessionFixture('pharma-rsm'),
    } as unknown as ReturnType<typeof useSession>)

    const { pharmaProjectsService } = await import('@/features/pharma/pharmaProjects.service')
    const { pharmaCampsService } = await import('@/features/pharma/pharmaCamps.service')
    vi.mocked(pharmaProjectsService.getProject).mockResolvedValue({ success: true, message: '', data: projectFixture() })
    // Scoped-empty response — RSM sees only camps they occupy an assignment
    // slot on, so the true project-wide count is unknowable from it.
    vi.mocked(pharmaCampsService.searchScopedCamps).mockResolvedValue({ success: true, message: '', data: { items: [], count: 0 } })

    await renderPage()

    expect(await screen.findByText(/no camps assigned to you on this project yet/i)).toBeInTheDocument()
    expect(screen.queryByText(/this project has no camps/i)).not.toBeInTheDocument()
  })

  it('division-head empty state correctly says the project has no camps yet (their scoping IS project-wide, unlike RSM/ASM/MR)', async () => {
    const { useSession } = await import('@/hooks/useSession')
    vi.mocked(useSession).mockReturnValue({
      isSettled: true, isConfirmedUnauthenticated: false, session: sessionFixture('pharma-division-head'),
    } as unknown as ReturnType<typeof useSession>)

    const { pharmaProjectsService } = await import('@/features/pharma/pharmaProjects.service')
    const { pharmaCampsService } = await import('@/features/pharma/pharmaCamps.service')
    vi.mocked(pharmaProjectsService.getProject).mockResolvedValue({ success: true, message: '', data: projectFixture() })
    vi.mocked(pharmaCampsService.searchScopedCamps).mockResolvedValue({ success: true, message: '', data: { items: [], count: 0 } })

    await renderPage()

    expect(await screen.findByText(/no camps have been booked for this project yet/i)).toBeInTheDocument()
    expect(screen.queryByText(/assigned to you/i)).not.toBeInTheDocument()
  })

  it('post-booking: closes the dialog and shows the newly booked camp in the refreshed list', async () => {
    const { useSession } = await import('@/hooks/useSession')
    vi.mocked(useSession).mockReturnValue({
      isSettled: true, isConfirmedUnauthenticated: false, session: sessionFixture('pharma-mr'),
    } as unknown as ReturnType<typeof useSession>)

    const { pharmaProjectsService } = await import('@/features/pharma/pharmaProjects.service')
    const { pharmaCampsService } = await import('@/features/pharma/pharmaCamps.service')
    const { doctorsService } = await import('@/features/doctors/doctors.service')
    const { campsRealService } = await import('@/features/camps/campsReal.service')

    vi.mocked(pharmaProjectsService.getProject).mockResolvedValue({ success: true, message: '', data: projectFixture() })
    vi.mocked(pharmaCampsService.searchScopedCamps)
      .mockResolvedValueOnce({ success: true, message: '', data: { items: [], count: 0 } })
      .mockResolvedValueOnce({ success: true, message: '', data: { items: [campFixture({ code: 'cmp-000002' })], count: 1 } })
    vi.mocked(doctorsService.searchDoctors).mockResolvedValue({
      success: true, message: '', data: { items: [{ id: 'doc-1', pharmaCode: 'DOC-1', name: 'Dr. Priya Sharma', specialization: 'cp', mobile: '9876543210', email: 'p@example.com', city: 'Pune', state: 'Maharashtra', pincode: '411001', googleMapLink: '', createdAt: '', updatedAt: '' } as never], count: 1 },
    })

    const user = userEvent.setup()
    await renderPage()

    await waitFor(() => expect(screen.getByText(/no camps assigned to you on this project yet/i)).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: /new camp/i }))
    await screen.findByText(/booking for project/i)

    await user.type(screen.getByPlaceholderText(/search doctor by name/i), 'Priya')
    const doctorOption = await screen.findByText(/Dr\. Priya Sharma/i, {}, { timeout: 3000 })
    await user.click(doctorOption)

    await user.type(screen.getByLabelText(/date/i), '2026-09-15')
    await user.type(screen.getByLabelText(/start time/i), '10:00')
    await user.type(screen.getByLabelText(/end time/i), '13:00')
    await user.type(screen.getByLabelText(/city/i), 'Pune')
    await user.type(screen.getByLabelText(/state/i), 'Maharashtra')
    await user.type(screen.getByLabelText(/longitude/i), '73.8567')
    await user.type(screen.getByLabelText(/latitude/i), '18.5204')

    await user.click(screen.getByRole('button', { name: /^book camp$/i }))

    await waitFor(() => expect(campsRealService.bookCamp).toHaveBeenCalledTimes(1))
    expect(vi.mocked(campsRealService.bookCamp).mock.calls[0][0].project).toBe('proj-1')

    // Dialog closes and the refetched, now-populated list renders.
    await waitFor(() => expect(screen.queryByText(/booking for project/i)).not.toBeInTheDocument())
    expect(await screen.findByText('cmp-000002')).toBeInTheDocument()
  })
})
