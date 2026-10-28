import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import NotificationBell from './NotificationBell'
import { notificationsService } from '@/features/notifications/notifications.service'
import type { SearchNotificationQuery } from '@/features/notifications/notifications.types'

vi.mock('@/features/notifications/notifications.service', () => ({
  notificationsService: {
    getMyNotifications: vi.fn(),
    markAllRead: vi.fn(),
  },
}))

function makeQueryClient() {
  // staleTime matches the app's real queryClient.ts default (5min) — without it, every test
  // query is "stale" by TanStack's own built-in default (0ms) and refetches on every mount
  // regardless of whether NotificationBell itself actually triggers a refetch, masking bugs
  // like the feed not refreshing when the popover reopens.
  return new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 5 * 60 * 1000 } } })
}

function renderBell() {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <MemoryRouter>
        <NotificationBell />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function itemFixture(id: string, read = false) {
  return {
    id,
    entity: { id: 'camp-1', type: 'camp', event: 'camp.create' },
    event: 'camp.create',
    channel: 'in-app' as const,
    subject: `Subject ${id}`,
    body: `Body ${id}`,
    status: 'sent' as const,
    sentAt: '2026-10-19T00:00:00Z',
    read,
    readAt: read ? '2026-10-19T00:00:00Z' : null,
    createdAt: '2026-10-19T00:00:00Z',
    updatedAt: '2026-10-19T00:00:00Z',
  }
}

describe('NotificationBell', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('fetches only the unread count on mount, not the feed, until the popover opens', async () => {
    vi.mocked(notificationsService.getMyNotifications).mockResolvedValue({
      success: true,
      message: '',
      data: { items: [], count: 0 },
    })

    renderBell()

    await waitFor(() =>
      expect(notificationsService.getMyNotifications).toHaveBeenCalledWith({ read: 'false', limit: '1' }),
    )
    expect(notificationsService.getMyNotifications).not.toHaveBeenCalledWith(
      expect.objectContaining({ page: '1' }),
    )
  })

  it('re-fetches the unread count when the popover opens, correcting a stale badge', async () => {
    let unreadCountCalls = 0
    vi.mocked(notificationsService.getMyNotifications).mockImplementation(async (query: SearchNotificationQuery) => {
      if (query.page) {
        return { success: true, message: '', data: { items: [], count: 0 } }
      }
      unreadCountCalls += 1
      // First call (mount) is stale (1 unread); later calls reflect the true, now-zero state.
      return { success: true, message: '', data: { items: [], count: unreadCountCalls === 1 ? 1 : 0 } }
    })

    const user = userEvent.setup()
    renderBell()

    await waitFor(() => {
      const trigger = screen.getByRole('button', { name: /notifications/i })
      expect(trigger.querySelector('span')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /notifications/i }))

    await waitFor(() => expect(unreadCountCalls).toBeGreaterThanOrEqual(2))
    await waitFor(() => {
      const trigger = screen.getByRole('button', { name: /notifications/i })
      expect(trigger.querySelector('span')).not.toBeInTheDocument()
    })
    expect(await screen.findByText(/no notifications yet/i)).toBeInTheDocument()
  })

  it('opening the popover fetches and renders the feed', async () => {
    vi.mocked(notificationsService.getMyNotifications).mockImplementation(async (query: SearchNotificationQuery) => {
      if (query.page) {
        return { success: true, message: '', data: { items: [itemFixture('a')], count: 1 } }
      }
      return { success: true, message: '', data: { items: [], count: 1 } }
    })

    const user = userEvent.setup()
    renderBell()

    await user.click(screen.getByRole('button', { name: /notifications/i }))

    expect(await screen.findByText('Subject a')).toBeInTheDocument()
    expect(screen.getByText('Body a')).toBeInTheDocument()
  })

  it('reopening the popover refetches the feed instead of showing stale cached content — a new notification that arrived while closed must not be hidden behind a red badge with no visible content', async () => {
    // The feed's query has the app-wide 5-minute staleTime, so without an explicit
    // refetch-on-open it would keep showing page 1's original single item even after a
    // second notification has landed server-side while the popover was closed.
    vi.mocked(notificationsService.getMyNotifications).mockImplementation(async (query: SearchNotificationQuery) => {
      if (query.page) {
        return { success: true, message: '', data: { items: [itemFixture('a')], count: 1 } }
      }
      return { success: true, message: '', data: { items: [], count: 1 } }
    })

    const user = userEvent.setup()
    renderBell()

    await user.click(screen.getByRole('button', { name: /notifications/i }))
    await screen.findByText('Subject a')
    await user.click(screen.getByRole('button', { name: /notifications/i })) // close

    vi.mocked(notificationsService.getMyNotifications).mockImplementation(async (query: SearchNotificationQuery) => {
      if (query.page) {
        return { success: true, message: '', data: { items: [itemFixture('b'), itemFixture('a')], count: 2 } }
      }
      return { success: true, message: '', data: { items: [], count: 2 } }
    })

    await user.click(screen.getByRole('button', { name: /notifications/i })) // reopen

    expect(await screen.findByText('Subject b')).toBeInTheDocument()
    expect(screen.getByText('Subject a')).toBeInTheDocument()
  })

  it('shows the unread badge when count > 0, hides it when 0', async () => {
    vi.mocked(notificationsService.getMyNotifications).mockResolvedValue({
      success: true,
      message: '',
      data: { items: [itemFixture('a')], count: 3 },
    })

    renderBell()

    await waitFor(() => {
      const trigger = screen.getByRole('button', { name: /notifications/i })
      expect(trigger.querySelector('span')).toBeInTheDocument()
    })
  })

  it('clicking Mark all read calls the mutation', async () => {
    vi.mocked(notificationsService.getMyNotifications).mockImplementation(async (query: SearchNotificationQuery) => {
      if (query.page) {
        return { success: true, message: '', data: { items: [itemFixture('a')], count: 1 } }
      }
      return { success: true, message: '', data: { items: [], count: 1 } }
    })
    vi.mocked(notificationsService.markAllRead).mockResolvedValue({
      success: true, message: '', data: { modified: 1 },
    })

    const user = userEvent.setup()
    renderBell()

    await user.click(screen.getByRole('button', { name: /notifications/i }))
    await screen.findByText('Subject a')

    await user.click(screen.getByRole('button', { name: /mark all read/i }))

    await waitFor(() => expect(notificationsService.markAllRead).toHaveBeenCalledTimes(1))
  })

  it('mark all read clears the unread indicator on every loaded page, including earlier ones, and clears the badge', async () => {
    let unreadCountCallCount = 0
    vi.mocked(notificationsService.getMyNotifications).mockImplementation(async (query: SearchNotificationQuery) => {
      if (query.page === '1') {
        return { success: true, message: '', data: { items: [itemFixture('a', false)], count: 2 } }
      }
      if (query.page === '2') {
        return { success: true, message: '', data: { items: [itemFixture('b', false)], count: 2 } }
      }
      // unread-count query (no `page`): 2 unread before mark-all-read, 0 after
      unreadCountCallCount += 1
      return { success: true, message: '', data: { items: [], count: unreadCountCallCount === 1 ? 2 : 0 } }
    })
    vi.mocked(notificationsService.markAllRead).mockImplementation(async () => {
      // simulate the backend having actually marked both rows read before the next refetch
      vi.mocked(notificationsService.getMyNotifications).mockImplementation(async (query: SearchNotificationQuery) => {
        if (query.page === '1') return { success: true, message: '', data: { items: [itemFixture('a', true)], count: 2 } }
        if (query.page === '2') return { success: true, message: '', data: { items: [itemFixture('b', true)], count: 2 } }
        return { success: true, message: '', data: { items: [], count: 0 } }
      })
      return { success: true, message: '', data: { modified: 2 } }
    })

    const user = userEvent.setup()
    renderBell()

    await user.click(screen.getByRole('button', { name: /notifications/i }))
    await screen.findByText('Subject a')
    expect(screen.getByLabelText('Unread')).toBeInTheDocument() // only page 1's card is loaded so far

    await user.click(screen.getByRole('button', { name: /load more/i }))
    await screen.findByText('Subject b')
    expect(screen.getAllByLabelText('Unread')).toHaveLength(2) // both pages' cards show unread

    await user.click(screen.getByRole('button', { name: /mark all read/i }))

    await waitFor(() => expect(screen.queryByLabelText('Unread')).not.toBeInTheDocument())
    // both cards (from both pages) are still rendered, just no longer marked unread
    expect(screen.getByText('Subject a')).toBeInTheDocument()
    expect(screen.getByText('Subject b')).toBeInTheDocument()
  })

  it('a failed Load more shows a retryable error, and retrying recovers', async () => {
    vi.mocked(notificationsService.getMyNotifications).mockImplementation(async (query: SearchNotificationQuery) => {
      if (query.page === '1') {
        return { success: true, message: '', data: { items: [itemFixture('a')], count: 2 } }
      }
      if (query.page === '2') {
        throw new Error('network error')
      }
      return { success: true, message: '', data: { items: [], count: 2 } }
    })

    const user = userEvent.setup()
    renderBell()

    await user.click(screen.getByRole('button', { name: /notifications/i }))
    await screen.findByText('Subject a')

    await user.click(screen.getByRole('button', { name: /load more/i }))

    expect(await screen.findByText(/couldn't load more/i)).toBeInTheDocument()
    // the failed-load-more state replaces the Load more button outright — no stale enabled button left behind
    expect(screen.queryByRole('button', { name: /^load more$/i })).not.toBeInTheDocument()

    // page 1's already-loaded card is untouched by the failed page-2 attempt
    expect(screen.getByText('Subject a')).toBeInTheDocument()

    vi.mocked(notificationsService.getMyNotifications).mockImplementation(async (query: SearchNotificationQuery) => {
      if (query.page === '1') return { success: true, message: '', data: { items: [itemFixture('a')], count: 2 } }
      if (query.page === '2') return { success: true, message: '', data: { items: [itemFixture('b')], count: 2 } }
      return { success: true, message: '', data: { items: [], count: 2 } }
    })

    await user.click(screen.getByRole('button', { name: /retry/i }))

    expect(await screen.findByText('Subject b')).toBeInTheDocument()
    expect(screen.queryByText(/couldn't load more/i)).not.toBeInTheDocument()
  })

  it('shows Mark all read when the count query fails but the loaded feed has unread cards', async () => {
    vi.mocked(notificationsService.getMyNotifications).mockImplementation(async (query: SearchNotificationQuery) => {
      if (query.page) {
        return { success: true, message: '', data: { items: [itemFixture('a', false)], count: 1 } }
      }
      throw new Error('network error') // unread-count query fails
    })

    const user = userEvent.setup()
    renderBell()

    await user.click(screen.getByRole('button', { name: /notifications/i }))
    await screen.findByText('Subject a')

    expect(await screen.findByText(/unread count unavailable/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /mark all read/i })).toBeInTheDocument()
  })

  it('hides Mark all read when the count query fails and the loaded feed has no unread cards', async () => {
    vi.mocked(notificationsService.getMyNotifications).mockImplementation(async (query: SearchNotificationQuery) => {
      if (query.page) {
        return { success: true, message: '', data: { items: [itemFixture('a', true)], count: 1 } }
      }
      throw new Error('network error')
    })

    const user = userEvent.setup()
    renderBell()

    await user.click(screen.getByRole('button', { name: /notifications/i }))
    await screen.findByText('Subject a')
    await screen.findByText(/unread count unavailable/i)

    expect(screen.queryByRole('button', { name: /mark all read/i })).not.toBeInTheDocument()
  })

  it('shows an empty state when there are no notifications', async () => {
    vi.mocked(notificationsService.getMyNotifications).mockResolvedValue({
      success: true,
      message: '',
      data: { items: [], count: 0 },
    })

    const user = userEvent.setup()
    renderBell()

    await user.click(screen.getByRole('button', { name: /notifications/i }))

    expect(await screen.findByText(/no notifications yet/i)).toBeInTheDocument()
  })

  it('clicking "View all" closes the popover and opens the full drawer', async () => {
    vi.mocked(notificationsService.getMyNotifications).mockResolvedValue({
      success: true,
      message: '',
      data: { items: [itemFixture('a')], count: 1 },
    })

    const user = userEvent.setup()
    renderBell()

    await user.click(screen.getByRole('button', { name: /notifications/i }))
    await screen.findByText('Subject a')

    await user.click(screen.getByRole('button', { name: /view all/i }))

    // The popover's compact feed is gone; the drawer's own "Notifications" heading + filters remain.
    expect(screen.queryByRole('button', { name: /^load more$/i })).not.toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'All' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Unread' })).toBeInTheDocument()
  })
})
