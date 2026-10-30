import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { AxiosInstance } from 'axios'
import { FiBox } from 'react-icons/fi'
import type { NotificationEntityItem } from '@qms/core'
import NotificationBellPopover from './NotificationBellPopover'
import type { EntityResolution } from './notifications.entityResolver'

function makeApi(): AxiosInstance {
  return { get: vi.fn(), patch: vi.fn() } as unknown as AxiosInstance
}

function makeQueryClient() {
  // staleTime matches the app's real queryClient.ts default (5min) — without it, every test
  // query is "stale" by TanStack's own built-in default (0ms) and refetches on every mount
  // regardless of whether the popover itself actually triggers a refetch, masking bugs like
  // the feed not refreshing when the popover reopens.
  return new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 5 * 60 * 1000 } } })
}

const resolveEntity = () => ({ icon: FiBox, label: 'Camp', href: (id: string) => `/camps?camp=${id}` }) as EntityResolution

function renderPopover(api: AxiosInstance, props?: Partial<Parameters<typeof NotificationBellPopover>[0]>) {
  function Harness() {
    return (
      <NotificationBellPopover
        api={api}
        open
        onOpenChange={vi.fn()}
        anchor={null}
        resolveEntity={resolveEntity}
        onNavigate={vi.fn()}
        drawerOpen={false}
        onDrawerOpenChange={vi.fn()}
        {...props}
      />
    )
  }
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <Harness />
    </QueryClientProvider>,
  )
}

function itemFixture(id: string, read = false): NotificationEntityItem {
  return {
    id,
    entity: { id: 'camp-1', type: 'camp', event: 'camp.create' },
    event: 'camp.create',
    channel: 'in-app',
    subject: `Subject ${id}`,
    body: `Body ${id}`,
    status: 'sent',
    sentAt: '2026-10-19T00:00:00Z',
    read,
    readAt: read ? '2026-10-19T00:00:00Z' : null,
    createdAt: '2026-10-19T00:00:00Z',
    updatedAt: '2026-10-19T00:00:00Z',
  }
}

function pageResponse(items: NotificationEntityItem[], count: number) {
  return { data: { success: true, message: '', data: { items, count } } }
}

describe('NotificationBellPopover', () => {
  let api: AxiosInstance

  beforeEach(() => {
    api = makeApi()
  })

  it('opening renders and fetches the feed', async () => {
    vi.mocked(api.get).mockImplementation(async (_url: string, config: { params: { page?: string } }) => {
      if (config.params.page) return pageResponse([itemFixture('a')], 1)
      return pageResponse([], 1)
    })

    renderPopover(api)

    expect(await screen.findByText('Subject a')).toBeInTheDocument()
    expect(screen.getByText('Body a')).toBeInTheDocument()
  })

  it('clicking Mark all read calls the mutation', async () => {
    vi.mocked(api.get).mockImplementation(async (_url: string, config: { params: { page?: string } }) => {
      if (config.params.page) return pageResponse([itemFixture('a')], 1)
      return pageResponse([], 1)
    })
    vi.mocked(api.patch).mockResolvedValue({ data: { success: true, message: '', data: { modified: 1 } } })

    const user = userEvent.setup()
    renderPopover(api)
    await screen.findByText('Subject a')

    await user.click(screen.getByRole('button', { name: /mark all read/i }))

    await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/notifications/me/read'))
  })

  it('mark all read clears the unread indicator on every loaded page, including earlier ones', async () => {
    let unreadCountCallCount = 0
    vi.mocked(api.get).mockImplementation(async (_url: string, config: { params: { page?: string } }) => {
      if (config.params.page === '1') return pageResponse([itemFixture('a', false)], 2)
      if (config.params.page === '2') return pageResponse([itemFixture('b', false)], 2)
      unreadCountCallCount += 1
      return pageResponse([], unreadCountCallCount === 1 ? 2 : 0)
    })
    vi.mocked(api.patch).mockImplementation(async () => {
      vi.mocked(api.get).mockImplementation(async (_url: string, config: { params: { page?: string } }) => {
        if (config.params.page === '1') return pageResponse([itemFixture('a', true)], 2)
        if (config.params.page === '2') return pageResponse([itemFixture('b', true)], 2)
        return pageResponse([], 0)
      })
      return { data: { success: true, message: '', data: { modified: 2 } } }
    })

    const user = userEvent.setup()
    renderPopover(api)
    await screen.findByText('Subject a')
    expect(screen.getByLabelText('Unread')).toBeInTheDocument() // only page 1's card is loaded so far

    await user.click(screen.getByRole('button', { name: /load more/i }))
    await screen.findByText('Subject b')
    expect(screen.getAllByLabelText('Unread')).toHaveLength(2) // both pages' cards show unread

    await user.click(screen.getByRole('button', { name: /mark all read/i }))

    await waitFor(() => expect(screen.queryByLabelText('Unread')).not.toBeInTheDocument())
    expect(screen.getByText('Subject a')).toBeInTheDocument()
    expect(screen.getByText('Subject b')).toBeInTheDocument()
  })

  it('a failed Load more shows a retryable error, and retrying recovers', async () => {
    vi.mocked(api.get).mockImplementation(async (_url: string, config: { params: { page?: string } }) => {
      if (config.params.page === '1') return pageResponse([itemFixture('a')], 2)
      if (config.params.page === '2') throw new Error('network error')
      return pageResponse([], 2)
    })

    const user = userEvent.setup()
    renderPopover(api)
    await screen.findByText('Subject a')

    await user.click(screen.getByRole('button', { name: /load more/i }))

    expect(await screen.findByText(/couldn't load more/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^load more$/i })).not.toBeInTheDocument()
    expect(screen.getByText('Subject a')).toBeInTheDocument()

    vi.mocked(api.get).mockImplementation(async (_url: string, config: { params: { page?: string } }) => {
      if (config.params.page === '1') return pageResponse([itemFixture('a')], 2)
      if (config.params.page === '2') return pageResponse([itemFixture('b')], 2)
      return pageResponse([], 2)
    })

    await user.click(screen.getByRole('button', { name: /retry/i }))

    expect(await screen.findByText('Subject b')).toBeInTheDocument()
    expect(screen.queryByText(/couldn't load more/i)).not.toBeInTheDocument()
  })

  it('shows Mark all read when the count query fails but the loaded feed has unread cards', async () => {
    vi.mocked(api.get).mockImplementation(async (_url: string, config: { params: { page?: string } }) => {
      if (config.params.page) return pageResponse([itemFixture('a', false)], 1)
      throw new Error('network error') // unread-count query fails
    })

    const user = userEvent.setup()
    renderPopover(api)
    await screen.findByText('Subject a')

    expect(await screen.findByText(/unread count unavailable/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /mark all read/i })).toBeInTheDocument()
  })

  it('hides Mark all read when the count query fails and the loaded feed has no unread cards', async () => {
    vi.mocked(api.get).mockImplementation(async (_url: string, config: { params: { page?: string } }) => {
      if (config.params.page) return pageResponse([itemFixture('a', true)], 1)
      throw new Error('network error')
    })

    const user = userEvent.setup()
    renderPopover(api)
    await screen.findByText('Subject a')
    await screen.findByText(/unread count unavailable/i)

    expect(screen.queryByRole('button', { name: /mark all read/i })).not.toBeInTheDocument()
  })

  it('shows an empty state when there are no notifications', async () => {
    vi.mocked(api.get).mockResolvedValue(pageResponse([], 0))

    renderPopover(api)

    expect(await screen.findByText(/no notifications yet/i)).toBeInTheDocument()
  })

  it('clicking "View all" calls onOpenChange(false) and onDrawerOpenChange(true)', async () => {
    vi.mocked(api.get).mockImplementation(async (_url: string, config: { params: { page?: string } }) => {
      if (config.params.page) return pageResponse([itemFixture('a')], 1)
      return pageResponse([], 1)
    })
    const onOpenChange = vi.fn()
    const onDrawerOpenChange = vi.fn()

    const user = userEvent.setup()
    renderPopover(api, { onOpenChange, onDrawerOpenChange })
    await screen.findByText('Subject a')

    await user.click(screen.getByRole('button', { name: /view all/i }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(onDrawerOpenChange).toHaveBeenCalledWith(true)
  })

  it('a card click closes the popover before navigating', async () => {
    vi.mocked(api.get).mockImplementation(async (_url: string, config: { params: { page?: string } }) => {
      if (config.params.page) return pageResponse([itemFixture('a')], 1)
      return pageResponse([], 1)
    })
    const onOpenChange = vi.fn()
    const onNavigate = vi.fn()

    const user = userEvent.setup()
    renderPopover(api, { onOpenChange, onNavigate })
    await screen.findByText('Subject a')

    await user.click(screen.getByRole('button', { name: /subject a/i }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(onNavigate).toHaveBeenCalledWith('/camps?camp=camp-1')
  })
})
