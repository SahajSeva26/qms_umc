import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, useParams } from 'react-router-dom'
import type { ProjectEntity } from '@/types/project.types'

vi.mock('@/features/pharma/pharmaProjects.service', () => ({
  pharmaProjectsService: {
    searchScopedProjects: vi.fn(),
  },
}))

// Defaults to allowing both screening and diet — a real project's `type` is never actually empty.
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

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

const CampsRouteStub = () => {
  const { id } = useParams<{ id: string }>()
  return <div>All camps for project {id}</div>
}

const ScreeningRouteStub = () => {
  const { id } = useParams<{ id: string }>()
  return <div>Screening camps for project {id}</div>
}

const DietRouteStub = () => {
  const { id } = useParams<{ id: string }>()
  return <div>Diet camps for project {id}</div>
}

async function renderPage(initialPath = '/pharma/rsm') {
  const PharmaProjectsPage = (await import('./PharmaProjectsPage')).default
  const queryClient = makeQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/pharma/rsm" element={<PharmaProjectsPage />} />
          <Route path="/pharma/projects/:id/camps" element={<CampsRouteStub />} />
          <Route path="/pharma/projects/:id/camps/screening" element={<ScreeningRouteStub />} />
          <Route path="/pharma/projects/:id/camps/diet" element={<DietRouteStub />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('PharmaProjectsPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('renders the projects returned by the scoped search — no client-side division filter param sent', async () => {
    const { pharmaProjectsService } = await import('@/features/pharma/pharmaProjects.service')
    vi.mocked(pharmaProjectsService.searchScopedProjects).mockResolvedValue({
      success: true, message: '', data: { items: [projectFixture()], count: 1 },
    })

    await renderPage()

    expect(await screen.findByText('Cardio Screening Drive')).toBeInTheDocument()
    expect(screen.getByText('PRJ-1')).toBeInTheDocument()

    // Division scoping is backend-derived from ctx.role.division for a pharma
    // caller — the frontend must never send its own division param.
    const query = vi.mocked(pharmaProjectsService.searchScopedProjects).mock.calls[0][0]
    expect(query).not.toHaveProperty('division')
  })

  it('shows every project status, not filtered to only live', async () => {
    const { pharmaProjectsService } = await import('@/features/pharma/pharmaProjects.service')
    vi.mocked(pharmaProjectsService.searchScopedProjects).mockResolvedValue({
      success: true,
      message: '',
      data: {
        items: [
          projectFixture({ id: 'proj-new', name: 'New Project', status: 'new' }),
          projectFixture({ id: 'proj-hold', name: 'Held Project', status: 'hold' }),
          projectFixture({ id: 'proj-closed', name: 'Closed Project', status: 'closed' }),
        ],
        count: 3,
      },
    })

    await renderPage()

    expect(await screen.findByText('New Project')).toBeInTheDocument()
    expect(screen.getByText('Held Project')).toBeInTheDocument()
    expect(screen.getByText('Closed Project')).toBeInTheDocument()
  })

  it('shows the empty state when no projects are in scope', async () => {
    const { pharmaProjectsService } = await import('@/features/pharma/pharmaProjects.service')
    vi.mocked(pharmaProjectsService.searchScopedProjects).mockResolvedValue({
      success: true, message: '', data: { items: [], count: 0 },
    })

    await renderPage()

    expect(await screen.findByText(/no projects found in your division/i)).toBeInTheDocument()
  })

  it('debounces search input into the name query param, resetting to page 1', async () => {
    const { pharmaProjectsService } = await import('@/features/pharma/pharmaProjects.service')
    vi.mocked(pharmaProjectsService.searchScopedProjects).mockResolvedValue({
      success: true, message: '', data: { items: [projectFixture()], count: 1 },
    })

    const user = userEvent.setup()
    await renderPage()
    await screen.findByText('Cardio Screening Drive')
    vi.mocked(pharmaProjectsService.searchScopedProjects).mockClear()

    await user.type(screen.getByPlaceholderText(/search projects by name/i), 'Cardio')

    await waitFor(() => expect(pharmaProjectsService.searchScopedProjects).toHaveBeenCalled(), { timeout: 3000 })
    const lastCall = vi.mocked(pharmaProjectsService.searchScopedProjects).mock.calls.at(-1)?.[0]
    expect(lastCall?.name).toBe('Cardio')
    expect(lastCall?.page).toBe('1')
  })

  it('a project allowing both screening and diet defaults to Screening (not the combined All-camps page)', async () => {
    const { pharmaProjectsService } = await import('@/features/pharma/pharmaProjects.service')
    vi.mocked(pharmaProjectsService.searchScopedProjects).mockResolvedValue({
      success: true, message: '', data: { items: [projectFixture({ id: 'proj-42', type: ['screening_camp', 'diet'] })], count: 1 },
    })

    const user = userEvent.setup()
    await renderPage()

    await user.click(await screen.findByText('Cardio Screening Drive'))

    expect(await screen.findByText(/screening camps for project proj-42/i)).toBeInTheDocument()
  })

  it('a diet-only project opens Diet directly, never an empty Screening page', async () => {
    const { pharmaProjectsService } = await import('@/features/pharma/pharmaProjects.service')
    vi.mocked(pharmaProjectsService.searchScopedProjects).mockResolvedValue({
      success: true, message: '', data: { items: [projectFixture({ id: 'proj-diet', type: ['diet'] })], count: 1 },
    })

    const user = userEvent.setup()
    await renderPage()

    await user.click(await screen.findByText('Cardio Screening Drive'))

    expect(await screen.findByText(/diet camps for project proj-diet/i)).toBeInTheDocument()
  })

  it('a lab-only project opens the unrestricted All-camps view, not a nonexistent Lab page', async () => {
    const { pharmaProjectsService } = await import('@/features/pharma/pharmaProjects.service')
    vi.mocked(pharmaProjectsService.searchScopedProjects).mockResolvedValue({
      success: true, message: '', data: { items: [projectFixture({ id: 'proj-lab', type: ['lab_test'] })], count: 1 },
    })

    const user = userEvent.setup()
    await renderPage()

    await user.click(await screen.findByText('Cardio Screening Drive'))

    expect(await screen.findByText(/all camps for project proj-lab/i)).toBeInTheDocument()
  })

  it('arriving with ?preferType=diet opens Diet for a project that allows both, instead of defaulting to Screening', async () => {
    const { pharmaProjectsService } = await import('@/features/pharma/pharmaProjects.service')
    vi.mocked(pharmaProjectsService.searchScopedProjects).mockResolvedValue({
      success: true, message: '', data: { items: [projectFixture({ id: 'proj-42', type: ['screening_camp', 'diet'] })], count: 1 },
    })

    const user = userEvent.setup()
    await renderPage('/pharma/rsm?preferType=diet')

    await user.click(await screen.findByText('Cardio Screening Drive'))

    expect(await screen.findByText(/diet camps for project proj-42/i)).toBeInTheDocument()
  })

  it('?preferType=diet still falls back to Screening for a screening-only project (the preferred type isn\'t allowed there)', async () => {
    const { pharmaProjectsService } = await import('@/features/pharma/pharmaProjects.service')
    vi.mocked(pharmaProjectsService.searchScopedProjects).mockResolvedValue({
      success: true, message: '', data: { items: [projectFixture({ id: 'proj-screen', type: ['screening_camp'] })], count: 1 },
    })

    const user = userEvent.setup()
    await renderPage('/pharma/rsm?preferType=diet')

    await user.click(await screen.findByText('Cardio Screening Drive'))

    expect(await screen.findByText(/screening camps for project proj-screen/i)).toBeInTheDocument()
  })
})
