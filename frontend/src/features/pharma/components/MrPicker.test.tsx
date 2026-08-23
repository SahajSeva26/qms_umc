import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { RoleEntity } from '@/types/accessManagement.types'

vi.mock('@/features/access-management/accessManagement.service', () => ({
  accessManagementService: {
    searchDownlineMrs: vi.fn(),
  },
}))

function mrFixture(id: string, name: string): RoleEntity {
  return { id, code: `phr-${id}`, name, permissions: [], status: 'active', type: 'rt-mr', user: 'u-1', tenant: 't-1', createdAt: '', updatedAt: '' } as RoleEntity
}

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

describe('MrPicker', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('shows a Load more control when more results exist than the first page, and appends the next page on click', async () => {
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    const page1 = Array.from({ length: 10 }, (_, i) => mrFixture(`mr-${i}`, `MR Number ${i}`))
    const page2 = [mrFixture('mr-10', 'MR Number 10')]

    vi.mocked(accessManagementService.searchDownlineMrs).mockImplementation(async (query) => {
      const page = query.page ?? '1'
      return {
        success: true,
        message: '',
        data: { items: page === '1' ? page1 : page2, count: 11 },
      }
    })

    const MrPicker = (await import('@/features/pharma/components/MrPicker')).default
    const onChange = vi.fn()
    const queryClient = makeQueryClient()
    const user = userEvent.setup()

    render(
      <QueryClientProvider client={queryClient}>
        <MrPicker value="" label="" onChange={onChange} />
      </QueryClientProvider>,
    )

    await user.type(screen.getByPlaceholderText(/search mr by name/i), 'MR')

    // Labels render as "MR Number 0 (phr-mr-0)" — match by substring, and
    // anchor "MR Number 10" so it doesn't also match "MR Number 1"/etc.
    await waitFor(() => expect(screen.getByText(/^MR Number 0 /)).toBeInTheDocument(), { timeout: 3000 })
    expect(screen.getByText(/^MR Number 9 /)).toBeInTheDocument()
    expect(screen.queryByText(/^MR Number 10 /)).not.toBeInTheDocument()

    const loadMoreButton = await screen.findByRole('button', { name: /load more/i })
    await user.click(loadMoreButton)

    await waitFor(() => expect(screen.getByText(/^MR Number 10 /)).toBeInTheDocument())
    // First page's results are still there — load-more appends, not replaces.
    expect(screen.getByText(/^MR Number 0 /)).toBeInTheDocument()
    // All 11 results now visible — no more Load more control.
    expect(screen.queryByRole('button', { name: /load more/i })).not.toBeInTheDocument()
  })

  it('does not duplicate rows when an already-loaded page is refetched (e.g. window-focus revalidation)', async () => {
    // React Query's structural sharing means a refetch that returns
    // BYTE-IDENTICAL content never even produces a new `data` reference, so
    // testing with identical content would trivially pass regardless of the
    // hook's own merge logic. Returning a genuinely different row for the
    // same id on refetch (e.g. the MR's name/code changed server-side) is
    // what actually forces a new `data` reference and exercises the
    // merge/append code path this test targets.
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    const page1 = Array.from({ length: 10 }, (_, i) => mrFixture(`mr-${i}`, `MR Number ${i}`))
    let page2RefetchCount = 0

    vi.mocked(accessManagementService.searchDownlineMrs).mockImplementation(async (query) => {
      const page = query.page ?? '1'
      if (page !== '1') {
        page2RefetchCount += 1
        return {
          success: true,
          message: '',
          data: { items: [mrFixture('mr-10', `MR Number 10 v${page2RefetchCount}`)], count: 11 },
        }
      }
      return { success: true, message: '', data: { items: [...page1], count: 11 } }
    })

    const MrPicker = (await import('@/features/pharma/components/MrPicker')).default
    const queryClient = makeQueryClient()
    const user = userEvent.setup()

    render(
      <QueryClientProvider client={queryClient}>
        <MrPicker value="" label="" onChange={vi.fn()} />
      </QueryClientProvider>,
    )

    await user.type(screen.getByPlaceholderText(/search mr by name/i), 'MR')
    await waitFor(() => expect(screen.getByText(/^MR Number 0 /)).toBeInTheDocument(), { timeout: 3000 })

    // Let the 300ms debounce fully settle before proceeding — otherwise the
    // debounced `name` filter can still land mid-test, which resets the
    // hook's own page/accumulated state (a real, separate, correct code
    // path) and would be mistaken here for the bug this test targets.
    await new Promise((r) => setTimeout(r, 400))

    const loadMoreButton = await screen.findByRole('button', { name: /load more/i })
    await user.click(loadMoreButton)
    await waitFor(() => expect(screen.getByText(/MR Number 10 v1/)).toBeInTheDocument())

    // Force a real refetch of ONLY the page-2 query — the cache also still
    // holds a stale page-1 entry from before "Load more" was clicked, so
    // refetching everything under ['downline-mrs'] would refetch that too
    // and not isolate the page-2-refetch path this test targets. Find page
    // 2's own exact key from the live cache instead of constructing it by
    // hand (the debounced `name` filter's presence in the key is timing-
    // sensitive, so guessing its shape is fragile).
    const page2Query = queryClient.getQueryCache().findAll({ queryKey: ['downline-mrs'] })
      .find((q) => (q.queryKey[1] as { page?: string } | undefined)?.page === '2')
    if (!page2Query) throw new Error('page 2 query not found in cache')
    await queryClient.refetchQueries({ queryKey: page2Query.queryKey, exact: true })
    await waitFor(() => expect(screen.getByText(/MR Number 10 v2/)).toBeInTheDocument())

    // v2 replaced v1 in place (same MR id, updated row) — v1 must not
    // linger as a second, stale entry alongside it.
    expect(screen.queryByText(/MR Number 10 v1/)).not.toBeInTheDocument()
    expect(screen.getAllByText(/MR Number 10 v2/)).toHaveLength(1)
    expect(screen.getAllByText(/^MR Number 0 /)).toHaveLength(1)
  })

  it('shows a working Retry control on search failure, wired to refetch the same query', async () => {
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    vi.mocked(accessManagementService.searchDownlineMrs)
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValue({
        success: true,
        message: '',
        data: { items: [mrFixture('mr-0', 'Cardio MR Mona')], count: 1 },
      })

    const MrPicker = (await import('@/features/pharma/components/MrPicker')).default
    const queryClient = makeQueryClient()
    const user = userEvent.setup()

    render(
      <QueryClientProvider client={queryClient}>
        <MrPicker value="" label="" onChange={vi.fn()} />
      </QueryClientProvider>,
    )

    await user.type(screen.getByPlaceholderText(/search mr by name/i), 'mo')

    const retryButton = await screen.findByRole('button', { name: /retry/i }, { timeout: 3000 })
    expect(screen.getByText(/couldn't load your team's mrs/i)).toBeInTheDocument()

    await user.click(retryButton)

    await waitFor(() => expect(screen.getByText(/^Cardio MR Mona /)).toBeInTheDocument())
    expect(vi.mocked(accessManagementService.searchDownlineMrs)).toHaveBeenCalledTimes(2)
  })

  it('does not show a Load more control when every result already fits on one page', async () => {
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    vi.mocked(accessManagementService.searchDownlineMrs).mockResolvedValue({
      success: true,
      message: '',
      data: { items: [mrFixture('mr-0', 'Solo MR')], count: 1 },
    })

    const MrPicker = (await import('@/features/pharma/components/MrPicker')).default
    const queryClient = makeQueryClient()
    const user = userEvent.setup()

    render(
      <QueryClientProvider client={queryClient}>
        <MrPicker value="" label="" onChange={vi.fn()} />
      </QueryClientProvider>,
    )

    await user.type(screen.getByPlaceholderText(/search mr by name/i), 'Solo')

    await waitFor(() => expect(screen.getByText(/^Solo MR /)).toBeInTheDocument(), { timeout: 3000 })
    expect(screen.queryByRole('button', { name: /load more/i })).not.toBeInTheDocument()
  })
})
