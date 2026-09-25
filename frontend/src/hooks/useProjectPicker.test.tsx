import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { useProjectPicker } from './useProjectPicker'
import { projectsService } from '@/features/projects/projects.service'

vi.mock('@/features/projects/projects.service', () => ({
  projectsService: {
    searchProjects: vi.fn(),
  },
}))

function makeWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return wrapper
}

function okResponse(items: { id: string; name: string; code: string }[], count = items.length) {
  return { success: true, message: '', data: { items, count } } as never
}

describe('useProjectPicker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not fetch at all when tenant/division are not both set, even with enabled=true', () => {
    vi.mocked(projectsService.searchProjects).mockResolvedValue(okResponse([]))
    const wrapper = makeWrapper()
    renderHook(() => useProjectPicker('', undefined, undefined, true), { wrapper })
    expect(projectsService.searchProjects).not.toHaveBeenCalled()
  })

  it('fetches immediately with an EMPTY query once tenant+division are both set — browse-all, not "start typing"', async () => {
    vi.mocked(projectsService.searchProjects).mockResolvedValue(
      okResponse([{ id: 'p1', name: 'Project One', code: 'prj-001' }]),
    )
    const wrapper = makeWrapper()
    const { result } = renderHook(() => useProjectPicker('', 't-1', 'd-1', true), { wrapper })

    await waitFor(() => expect(result.current.projects).toHaveLength(1))
    expect(projectsService.searchProjects).toHaveBeenCalledWith(
      expect.objectContaining({ tenant: 't-1', division: 'd-1', name: undefined }),
    )
  })

  it('typing a name still narrows the search once tenant+division are set', async () => {
    vi.mocked(projectsService.searchProjects).mockResolvedValue(okResponse([]))
    const wrapper = makeWrapper()
    const { result, rerender } = renderHook(
      ({ name }) => useProjectPicker(name, 't-1', 'd-1', true),
      { wrapper, initialProps: { name: '' } },
    )
    await waitFor(() => expect(projectsService.searchProjects).toHaveBeenCalled())

    rerender({ name: 'Cipla' })
    await waitFor(() =>
      expect(projectsService.searchProjects).toHaveBeenLastCalledWith(
        expect.objectContaining({ name: 'Cipla' }),
      ),
    )
    void result
  })

  it('does not fetch while enabled=false (the picker is closed), even with tenant+division set', () => {
    vi.mocked(projectsService.searchProjects).mockResolvedValue(okResponse([]))
    const wrapper = makeWrapper()
    renderHook(() => useProjectPicker('', 't-1', 'd-1', false), { wrapper })
    expect(projectsService.searchProjects).not.toHaveBeenCalled()
  })

  it('a division with zero projects resolves to an empty, non-loading, non-error result once the browse-all fetch completes', async () => {
    vi.mocked(projectsService.searchProjects).mockResolvedValue(okResponse([]))
    const wrapper = makeWrapper()
    const { result } = renderHook(() => useProjectPicker('', 't-1', 'd-empty', true), { wrapper })

    await waitFor(() => expect(result.current.isFetching).toBe(false))
    expect(result.current.projects).toHaveLength(0)
    expect(result.current.error).toBeNull()
    expect(result.current.hasMore).toBe(false)
  })

  it('a division with 11+ projects still paginates via loadMore/hasMore correctly', async () => {
    const page1 = Array.from({ length: 10 }, (_, i) => ({ id: `p${i}`, name: `Project ${i}`, code: `prj-${i}` }))
    const page2 = [{ id: 'p10', name: 'Project 10', code: 'prj-10' }]
    vi.mocked(projectsService.searchProjects)
      .mockResolvedValueOnce(okResponse(page1, 11))
      .mockResolvedValueOnce(okResponse(page2, 11))

    const wrapper = makeWrapper()
    const { result } = renderHook(() => useProjectPicker('', 't-1', 'd-1', true), { wrapper })

    await waitFor(() => expect(result.current.projects).toHaveLength(10))
    expect(result.current.hasMore).toBe(true)

    result.current.loadMore()

    await waitFor(() => expect(result.current.projects).toHaveLength(11))
    expect(result.current.hasMore).toBe(false)
  })

  it('changing division resets pagination/accumulated results back to page 1', async () => {
    vi.mocked(projectsService.searchProjects).mockResolvedValue(
      okResponse([{ id: 'p1', name: 'Div A Project', code: 'prj-a' }], 1),
    )
    const wrapper = makeWrapper()
    const { result, rerender } = renderHook(
      ({ division }) => useProjectPicker('', 't-1', division, true),
      { wrapper, initialProps: { division: 'd-1' } },
    )
    await waitFor(() => expect(result.current.projects).toHaveLength(1))

    vi.mocked(projectsService.searchProjects).mockResolvedValue(
      okResponse([{ id: 'p2', name: 'Div B Project', code: 'prj-b' }], 1),
    )
    rerender({ division: 'd-2' })

    await waitFor(() => expect(result.current.projects.map((p) => p.id)).toEqual(['p2']))
  })
})
