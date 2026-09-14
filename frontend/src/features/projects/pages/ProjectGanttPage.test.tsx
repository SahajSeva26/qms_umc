import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'

vi.mock('@/hooks/usePermission')
vi.mock('@/features/projects/projects.service', () => ({
  projectsService: {
    searchProjects: vi.fn(async () => ({ success: true, message: '', data: { items: [], count: 0 } })),
    getProjectReport: vi.fn(async () => ({
      success: true,
      message: '',
      data: { summary: { totalProjects: 0 }, byStatus: [], byTherapy: [] },
    })),
  },
}))

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
  const ProjectGanttPage = (await import('./ProjectGanttPage')).default
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <ProjectGanttPage />
    </QueryClientProvider>,
  )
}

describe('ProjectGanttPage — write-permission gating', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('hides the "New project" button without project:manage/tenant:manage', async () => {
    await mockPermission(false)
    await renderPage()

    expect(await screen.findByRole('heading', { name: /project gantt/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /new project/i })).not.toBeInTheDocument()
  })

  it('shows the "New project" button with project:manage/tenant:manage', async () => {
    await mockPermission(true)
    await renderPage()

    expect(await screen.findByRole('button', { name: /new project/i })).toBeInTheDocument()
  })
})

describe('ProjectGanttPage — KPI strip from the real project report', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('shows "Statistics are available to project managers" instead of the strip when the caller lacks the report permission', async () => {
    await mockPermission(false)
    await renderPage()

    expect(await screen.findByText(/statistics are available to project managers/i)).toBeInTheDocument()
    expect(screen.queryByText('Projects')).not.toBeInTheDocument()
  })

  it('renders real per-status counts from GET /projects/report, not the fetched (possibly-truncated) project list', async () => {
    const { projectsService } = await import('@/features/projects/projects.service')
    vi.mocked(projectsService.getProjectReport).mockResolvedValue({
      success: true,
      message: '',
      data: {
        summary: { totalProjects: 42 },
        byStatus: [
          { status: 'new', count: 5, revenue: 0 },
          { status: 'live', count: 20, revenue: 0 },
          { status: 'hold', count: 7, revenue: 0 },
          { status: 'closed', count: 10, revenue: 0 },
        ],
        byTherapy: [],
      },
    })
    await mockPermission(true)
    await renderPage()

    expect(await screen.findByText('42')).toBeInTheDocument()
    expect(screen.getByText('20')).toBeInTheDocument()
    expect(screen.getByText('7')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
    // The dropped tiles must not reappear.
    expect(screen.queryByText(/total camps/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/overdue renewal/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/renewing < 30d/i)).not.toBeInTheDocument()
  })
})
