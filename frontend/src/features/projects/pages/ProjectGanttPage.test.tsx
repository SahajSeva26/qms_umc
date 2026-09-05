import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'

vi.mock('@/hooks/usePermission')
vi.mock('@/features/projects/projects.service', () => ({
  projectsService: {
    searchProjects: vi.fn(async () => ({ success: true, message: '', data: { items: [], count: 0 } })),
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
