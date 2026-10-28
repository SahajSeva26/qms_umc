import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import ProjectDevicesRequiredCard from './ProjectDevicesRequiredCard'
import { pharmaProjectsService } from '@/features/pharma/pharmaProjects.service'

vi.mock('@/features/pharma/pharmaProjects.service', () => ({
  pharmaProjectsService: {
    getProjectRequirements: vi.fn(),
  },
}))

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

function renderCard(projectId: string | null, campType: 'screening' | 'diet' | 'lab' | '' = 'screening') {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <ProjectDevicesRequiredCard projectId={projectId} campType={campType} />
    </QueryClientProvider>,
  )
}

describe('ProjectDevicesRequiredCard — GET /projects/:id/requirements (requested, see md-files/BACKEND_REQUEST_book-camp-requirements.md)', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('renders nothing when no project is picked yet', () => {
    const { container } = renderCard(null)
    expect(container).toBeEmptyDOMElement()
    expect(pharmaProjectsService.getProjectRequirements).not.toHaveBeenCalled()
  })

  it('renders nothing when a project is picked but no camp type yet — fires only once BOTH are present', () => {
    const { container } = renderCard('proj-1', '')
    expect(container).toBeEmptyDOMElement()
    expect(pharmaProjectsService.getProjectRequirements).not.toHaveBeenCalled()
  })

  it('shows a compact skeleton while loading, once both project and camp type are present', () => {
    vi.mocked(pharmaProjectsService.getProjectRequirements).mockReturnValue(new Promise(() => {}))
    renderCard('proj-1', 'screening')

    const skeleton = screen.getByText('', { selector: '.animate-pulse' })
    expect(skeleton).toBeInTheDocument()
  })

  it('shows the real device pills once loaded', async () => {
    vi.mocked(pharmaProjectsService.getProjectRequirements).mockResolvedValue({
      success: true, message: '', data: { devices: [{ id: 'dev-1', code: 'BP-01', name: 'BP Monitor' }, { id: 'dev-2', code: 'GLU-01', name: 'Glucometer' }] },
    })
    renderCard('proj-1', 'screening')

    expect(await screen.findByText('BP Monitor')).toBeInTheDocument()
    expect(screen.getByText('Glucometer')).toBeInTheDocument()
    expect(screen.getByText(/devices required/i)).toBeInTheDocument()
  })

  it('shows an honest empty state when the project needs no devices', async () => {
    vi.mocked(pharmaProjectsService.getProjectRequirements).mockResolvedValue({
      success: true, message: '', data: { devices: [] },
    })
    renderCard('proj-1', 'screening')

    expect(await screen.findByText(/require no devices/i)).toBeInTheDocument()
  })

  it('shows a non-blocking, Retry-capable error on failure (e.g. 404 before the backend request ships) — not a silent disappearance', async () => {
    vi.mocked(pharmaProjectsService.getProjectRequirements).mockRejectedValue(new Error('404'))
    renderCard('proj-1', 'screening')

    expect(await screen.findByText(/couldn't load this project's device requirements/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })

  it('a projectId change mid-flight never renders the OLD project\'s stale devices — the new key starts a fresh query', async () => {
    vi.mocked(pharmaProjectsService.getProjectRequirements).mockImplementation(async (id: string) => {
      if (id === 'proj-old') return { success: true, message: '', data: { devices: [{ id: 'dev-old', code: 'OLD', name: 'Old Project Device' }] } }
      return { success: true, message: '', data: { devices: [{ id: 'dev-new', code: 'NEW', name: 'New Project Device' }] } }
    })

    const { rerender } = render(
      <QueryClientProvider client={makeQueryClient()}>
        <ProjectDevicesRequiredCard projectId="proj-old" campType="screening" />
      </QueryClientProvider>,
    )
    expect(await screen.findByText('Old Project Device')).toBeInTheDocument()

    const client = makeQueryClient()
    rerender(
      <QueryClientProvider client={client}>
        <ProjectDevicesRequiredCard projectId="proj-new" campType="screening" />
      </QueryClientProvider>,
    )

    expect(await screen.findByText('New Project Device')).toBeInTheDocument()
    expect(screen.queryByText('Old Project Device')).not.toBeInTheDocument()
  })
})
