import { describe, it, expect, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
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

// Unrestricted "All camps" view — no type filter, no booking (see TypeScopedPharmaCampsPage.test.tsx for that).
describe('PharmaProjectCampsPage — unrestricted "All camps" view', () => {
  it('blocks a camp:book-holding but non-pharma role type from the real deep-linked page — neither project nor camps ever fetch', async () => {
    const { useSession } = await import('@/hooks/useSession')
    vi.mocked(useSession).mockReturnValue({
      isSettled: true, isConfirmedUnauthenticated: false, session: sessionFixture('some-other-custom-role'), hasPermission: () => false,
    } as unknown as ReturnType<typeof useSession>)

    const { pharmaProjectsService } = await import('@/features/pharma/pharmaProjects.service')
    const { pharmaCampsService } = await import('@/features/pharma/pharmaCamps.service')

    await renderPage()

    expect(await screen.findByText(/not available for your role/i)).toBeInTheDocument()
    expect(pharmaProjectsService.getProject).not.toHaveBeenCalled()
    expect(pharmaCampsService.searchScopedCamps).not.toHaveBeenCalled()
  })

  it('never fetches camps when the project is inaccessible (404)', async () => {
    const { useSession } = await import('@/hooks/useSession')
    vi.mocked(useSession).mockReturnValue({
      isSettled: true, isConfirmedUnauthenticated: false, session: sessionFixture('pharma-rsm'), hasPermission: () => false,
    } as unknown as ReturnType<typeof useSession>)

    const { pharmaProjectsService } = await import('@/features/pharma/pharmaProjects.service')
    const { pharmaCampsService } = await import('@/features/pharma/pharmaCamps.service')
    vi.mocked(pharmaProjectsService.getProject).mockRejectedValue(new Error('Not found'))

    await renderPage()

    await waitFor(() => expect(screen.getByText(/not found, or you don't have access/i)).toBeInTheDocument())
    expect(pharmaCampsService.searchScopedCamps).not.toHaveBeenCalled()
  })

  it('fetches camps with NO type filter — every type incl. Lab is shown, never narrowed by the project\'s own configured type', async () => {
    const { useSession } = await import('@/hooks/useSession')
    vi.mocked(useSession).mockReturnValue({
      isSettled: true, isConfirmedUnauthenticated: false, session: sessionFixture('pharma-rsm'), hasPermission: () => false,
    } as unknown as ReturnType<typeof useSession>)

    const { pharmaProjectsService } = await import('@/features/pharma/pharmaProjects.service')
    const { pharmaCampsService } = await import('@/features/pharma/pharmaCamps.service')
    // A Screening-only project can still have a stray Lab (or any other type)
    // camp attached — the backend doesn't enforce project-type-to-camp-type.
    vi.mocked(pharmaProjectsService.getProject).mockResolvedValue({ success: true, message: '', data: projectFixture({ type: ['screening_camp'] }) })
    vi.mocked(pharmaCampsService.searchScopedCamps).mockResolvedValue({
      success: true, message: '', data: { items: [campFixture({ type: 'lab' }), campFixture({ id: 'camp-2', code: 'cmp-000002', type: 'screening' })], count: 2 },
    })

    await renderPage()

    expect(await screen.findByText('cmp-000001')).toBeInTheDocument()
    expect(screen.getByText('cmp-000002')).toBeInTheDocument()
    const query = vi.mocked(pharmaCampsService.searchScopedCamps).mock.calls[0][0]
    expect(query).not.toHaveProperty('type')
  })

  it('RSM/ASM/MR empty state never claims the whole project has no camps', async () => {
    const { useSession } = await import('@/hooks/useSession')
    vi.mocked(useSession).mockReturnValue({
      isSettled: true, isConfirmedUnauthenticated: false, session: sessionFixture('pharma-rsm'), hasPermission: () => false,
    } as unknown as ReturnType<typeof useSession>)

    const { pharmaProjectsService } = await import('@/features/pharma/pharmaProjects.service')
    const { pharmaCampsService } = await import('@/features/pharma/pharmaCamps.service')
    vi.mocked(pharmaProjectsService.getProject).mockResolvedValue({ success: true, message: '', data: projectFixture() })
    vi.mocked(pharmaCampsService.searchScopedCamps).mockResolvedValue({ success: true, message: '', data: { items: [], count: 0 } })

    await renderPage()

    expect(await screen.findByText(/no camps assigned to you on this project yet/i)).toBeInTheDocument()
    expect(screen.queryByText(/this project has no camps/i)).not.toBeInTheDocument()
  })

  it('division-head empty state correctly says the project has no camps yet (their scoping IS project-wide, unlike RSM/ASM/MR)', async () => {
    const { useSession } = await import('@/hooks/useSession')
    vi.mocked(useSession).mockReturnValue({
      isSettled: true, isConfirmedUnauthenticated: false, session: sessionFixture('pharma-division-head'), hasPermission: () => false,
    } as unknown as ReturnType<typeof useSession>)

    const { pharmaProjectsService } = await import('@/features/pharma/pharmaProjects.service')
    const { pharmaCampsService } = await import('@/features/pharma/pharmaCamps.service')
    vi.mocked(pharmaProjectsService.getProject).mockResolvedValue({ success: true, message: '', data: projectFixture() })
    vi.mocked(pharmaCampsService.searchScopedCamps).mockResolvedValue({ success: true, message: '', data: { items: [], count: 0 } })

    await renderPage()

    expect(await screen.findByText(/no camps have been booked for this project yet/i)).toBeInTheDocument()
    expect(screen.queryByText(/assigned to you/i)).not.toBeInTheDocument()
  })

  it('has no "New camp" button — booking always happens on the dedicated Screening/Diet page', async () => {
    const { useSession } = await import('@/hooks/useSession')
    vi.mocked(useSession).mockReturnValue({
      isSettled: true, isConfirmedUnauthenticated: false, session: sessionFixture('pharma-mr'), hasPermission: () => false,
    } as unknown as ReturnType<typeof useSession>)

    const { pharmaProjectsService } = await import('@/features/pharma/pharmaProjects.service')
    const { pharmaCampsService } = await import('@/features/pharma/pharmaCamps.service')
    vi.mocked(pharmaProjectsService.getProject).mockResolvedValue({ success: true, message: '', data: projectFixture() })
    vi.mocked(pharmaCampsService.searchScopedCamps).mockResolvedValue({ success: true, message: '', data: { items: [], count: 0 } })

    await renderPage()

    await screen.findByText('Cardio Screening Drive')
    expect(screen.queryByRole('button', { name: /new camp/i })).not.toBeInTheDocument()
  })
})
