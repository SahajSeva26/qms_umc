import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ProjectPicker from './ProjectPicker'
import { projectsService } from '@/features/projects/projects.service'

vi.mock('@/features/projects/projects.service', () => ({
  projectsService: {
    searchProjects: vi.fn(),
  },
}))

function okResponse(items: unknown[], count = items.length) {
  return { success: true, message: '', data: { items, count } } as never
}

function renderPicker(props: { tenant?: string; division?: string } = { tenant: 't-1', division: 'd-1' }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const onChange = vi.fn()
  const onClear = vi.fn()
  render(
    <QueryClientProvider client={queryClient}>
      <ProjectPicker
        value=""
        label="Project"
        tenant={props.tenant}
        division={props.division}
        onChange={onChange}
        onClear={onClear}
      />
    </QueryClientProvider>,
  )
  return { onChange, onClear }
}

describe('ProjectPicker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('opening with tenant+division already selected and an EMPTY query shows the division\'s projects immediately, not "start typing"', async () => {
    vi.mocked(projectsService.searchProjects).mockResolvedValue(okResponse([{ id: 'p1', code: 'prj-001', name: 'Cipla Project' }]))
    renderPicker()

    const input = screen.getByPlaceholderText(/search or browse projects/i)
    const user = userEvent.setup()
    await user.click(input)

    await waitFor(() => expect(screen.getByText(/cipla project \(prj-001\)/i)).toBeInTheDocument())
    expect(screen.queryByText(/start typing to search projects/i)).not.toBeInTheDocument()
  })

  it('a division with zero projects, once the browse-all fetch completes, shows the NEW emptyResultsText copy — the OLD "Start typing" text must never render once tenant+division are set', async () => {
    vi.mocked(projectsService.searchProjects).mockResolvedValue(okResponse([]))
    renderPicker()

    const input = screen.getByPlaceholderText(/search or browse projects/i)
    const user = userEvent.setup()
    await user.click(input)

    await waitFor(() => expect(screen.getByText(/no projects found under this division/i)).toBeInTheDocument())
    expect(screen.queryByText(/start typing to search projects/i)).not.toBeInTheDocument()
  })

  it('typing further narrows the list via the existing debounced search', async () => {
    vi.mocked(projectsService.searchProjects).mockResolvedValue(okResponse([]))
    renderPicker()

    const input = screen.getByPlaceholderText(/search or browse projects/i)
    const user = userEvent.setup()
    await user.type(input, 'Cipla')

    await waitFor(() =>
      expect(projectsService.searchProjects).toHaveBeenLastCalledWith(
        expect.objectContaining({ name: 'Cipla' }),
      ),
    )
  })

  it('shows "Select a company first" / "Select a division first" — not the browse-capable copy — until both are chosen', () => {
    renderPicker({ tenant: undefined, division: undefined })
    expect(screen.getByPlaceholderText(/select a company first/i)).toBeInTheDocument()
  })

  it('a division with 11+ projects still paginates via "Load more"', async () => {
    const page1 = Array.from({ length: 10 }, (_, i) => ({ id: `p${i}`, code: `prj-${i}`, name: `Project ${i}` }))
    vi.mocked(projectsService.searchProjects).mockResolvedValueOnce(okResponse(page1, 11))
    renderPicker()

    const input = screen.getByPlaceholderText(/search or browse projects/i)
    const user = userEvent.setup()
    await user.click(input)

    await waitFor(() => expect(screen.getByRole('button', { name: /load more/i })).toBeInTheDocument())
  })
})
