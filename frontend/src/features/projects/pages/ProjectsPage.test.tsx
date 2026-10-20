import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { AxiosError } from 'axios'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { toast } from 'sonner'
import type { ProjectEntity } from '@/types/project.types'

vi.mock('@/hooks/usePermission')
vi.mock('@/features/projects/projects.service', () => ({
  projectsService: {
    searchProjects: vi.fn(async () => ({ success: true, message: '', data: { items: [], count: 0 } })),
    getProject: vi.fn(async () => ({ success: true, message: '', data: null })),
  },
}))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

// Mirrors apiError.test.ts's fixture — a real axios error shape so isForbiddenError/
// isNotFoundError (which gate the deep-link failure handling) classify it correctly.
function axiosError(status: number): AxiosError {
  const err = new Error('request failed') as AxiosError
  err.isAxiosError = true
  err.response = { status, data: {}, statusText: '', headers: {}, config: {} as never }
  err.toJSON = () => ({})
  return err
}

function projectFixture(overrides: Partial<ProjectEntity> = {}): ProjectEntity {
  return {
    id: 'proj-1', code: 'prj-000001', name: 'Test Project',
    tenant: 't-1', division: { _id: 'div-1', name: 'Div', code: 'div-1', therapy: [] },
    therapy: 'cardiology', type: ['screening'], tests: [], lead: null, executionMode: null,
    campCost: 0, totalCamps: 0, gst: 0, valueBeforeGST: 0, additionalCost: 0,
    campTimeSlots: ['9am-1pm'], freeCancelHours: 0, cancellationAllowed: 0,
    campCostDeductionOnChargableCancel: 0, goLiveScope: null, whoCanBookCamp: [],
    salesRep: { _id: 'r-1', code: 'sr-1', name: 'Rep' }, projectCoordinator: { _id: 'r-2', code: 'pc-1', name: 'Coord' },
    marketingContact: { _id: 'c-1', name: 'Contact' }, paymentTerms: 'net_30', status: 'new', stageHistory: [],
    daysToBookBefore: 0, dietChart: [], poRenewalReminder: 0, availablePointers: [],
    tats: '', sops: '', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', ...overrides,
  } as ProjectEntity
}

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

async function mockPermission(canWrite: boolean) {
  const { usePermission } = await import('@/hooks/usePermission')
  vi.mocked(usePermission).mockReturnValue({
    hasAnyPermission: () => canWrite,
  } as unknown as ReturnType<typeof usePermission>)
}

async function renderPage() {
  const ProjectsPage = (await import('./ProjectsPage')).default
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <MemoryRouter>
        <ProjectsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ProjectsPage — write-permission gating', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('hides the "New project" button without project:manage/tenant:manage', async () => {
    await mockPermission(false)
    await renderPage()

    expect(await screen.findByRole('heading', { name: /project management/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /new project/i })).not.toBeInTheDocument()
  })

  it('shows the "New project" button with project:manage/tenant:manage', async () => {
    await mockPermission(true)
    await renderPage()

    expect(await screen.findByRole('button', { name: /new project/i })).toBeInTheDocument()
  })
})

describe('ProjectsPage — ?project=<id> deep link (notification click-through)', () => {
  beforeEach(async () => {
    vi.resetAllMocks()
    await mockPermission(true)
  })

  it('opens the drawer for a project already on the loaded page', async () => {
    const { projectsService } = await import('@/features/projects/projects.service')
    vi.mocked(projectsService.searchProjects).mockResolvedValue({
      success: true, message: '', data: { items: [projectFixture({ id: 'p1', name: 'Loaded Project' })], count: 1 },
    } as never)

    const ProjectsPage = (await import('./ProjectsPage')).default
    render(
      <QueryClientProvider client={makeQueryClient()}>
        <MemoryRouter initialEntries={['/projects?project=p1']}>
          <ProjectsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(await screen.findByRole('heading', { name: /Loaded Project/i })).toBeInTheDocument()
  })

  it('falls back to a direct GET /projects/:id when the deep-linked project is not on the loaded page', async () => {
    const { projectsService } = await import('@/features/projects/projects.service')
    vi.mocked(projectsService.searchProjects).mockResolvedValue({
      success: true, message: '', data: { items: [], count: 0 },
    } as never)
    vi.mocked(projectsService.getProject).mockResolvedValue({
      success: true, message: '', data: projectFixture({ id: 'p2', name: 'Fetched Project' }),
    } as never)

    const ProjectsPage = (await import('./ProjectsPage')).default
    render(
      <QueryClientProvider client={makeQueryClient()}>
        <MemoryRouter initialEntries={['/projects?project=p2']}>
          <ProjectsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(await screen.findByRole('heading', { name: /Fetched Project/i })).toBeInTheDocument()
  })

  it('a confirmed 404 on the direct fetch is treated as terminal: shows an error toast and clears the dead ?project= param', async () => {
    const { projectsService } = await import('@/features/projects/projects.service')
    vi.mocked(projectsService.searchProjects).mockResolvedValue({
      success: true, message: '', data: { items: [], count: 0 },
    } as never)
    vi.mocked(projectsService.getProject).mockRejectedValue(axiosError(404))

    const ProjectsPage = (await import('./ProjectsPage')).default
    render(
      <QueryClientProvider client={makeQueryClient()}>
        <MemoryRouter initialEntries={['/projects?project=deleted-project']}>
          <ProjectsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    await waitFor(() => expect(toast.error).toHaveBeenCalled())
    expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/may have been removed/i))
    // No "Retry" action on a terminal failure — just the message.
    expect(vi.mocked(toast.error).mock.calls[0][1]).toBeUndefined()
  })

  it('a confirmed 403 on the direct fetch is also treated as terminal, same as a 404', async () => {
    const { projectsService } = await import('@/features/projects/projects.service')
    vi.mocked(projectsService.searchProjects).mockResolvedValue({
      success: true, message: '', data: { items: [], count: 0 },
    } as never)
    vi.mocked(projectsService.getProject).mockRejectedValue(axiosError(403))

    const ProjectsPage = (await import('./ProjectsPage')).default
    render(
      <QueryClientProvider client={makeQueryClient()}>
        <MemoryRouter initialEntries={['/projects?project=forbidden-project']}>
          <ProjectsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    await waitFor(() => expect(toast.error).toHaveBeenCalled())
    expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/may have been removed/i))
  })

  it('a transient failure (5xx/network) on the direct fetch keeps the ?project= param and offers a Retry action instead of giving up on the destination', async () => {
    const { projectsService } = await import('@/features/projects/projects.service')
    vi.mocked(projectsService.searchProjects).mockResolvedValue({
      success: true, message: '', data: { items: [], count: 0 },
    } as never)
    vi.mocked(projectsService.getProject).mockRejectedValue(axiosError(500))

    const ProjectsPage = (await import('./ProjectsPage')).default
    render(
      <QueryClientProvider client={makeQueryClient()}>
        <MemoryRouter initialEntries={['/projects?project=flaky-project']}>
          <ProjectsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    await waitFor(() => expect(toast.error).toHaveBeenCalled())
    expect(toast.error).toHaveBeenCalledWith(
      expect.stringMatching(/try again/i),
      expect.objectContaining({ action: expect.objectContaining({ label: 'Retry' }) }),
    )

    // Clicking the toast's Retry action calls the query's own refetch, which re-invokes the service.
    vi.mocked(projectsService.getProject).mockClear()
    const [, options] = vi.mocked(toast.error).mock.calls[0]
    const action = options?.action as { onClick: () => void } | undefined
    action?.onClick()

    await waitFor(() => expect(projectsService.getProject).toHaveBeenCalledWith('flaky-project'))
  })
})
