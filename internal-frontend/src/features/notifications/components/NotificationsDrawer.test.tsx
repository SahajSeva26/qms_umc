import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import NotificationsDrawer from './NotificationsDrawer'
import { notificationsService } from '@/features/notifications/notifications.service'
import type { SearchNotificationQuery } from '@/features/notifications/notifications.types'

vi.mock('@/features/notifications/notifications.service', () => ({
  notificationsService: {
    getMyNotifications: vi.fn(),
    markAllRead: vi.fn(),
  },
}))

// Not the focus of this file (see notifications.entityResolver.test.ts / NotificationCard.test.tsx
// for permission-gating coverage) — grant camp:search so the resolved "Camp" label renders here.
vi.mock('@/hooks/useSession', () => ({
  useSession: vi.fn(() => ({
    session: { roleType: { code: 'camp-coord' } },
    hasAnyPermission: (codes: string[]) => codes.includes('camp:search'),
  })),
}))

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

function renderDrawer(open = true, onClose = vi.fn()) {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <MemoryRouter>
        <NotificationsDrawer open={open} onClose={onClose} />
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

describe('NotificationsDrawer', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('does not fetch the paged feed while closed (the unread-count query runs independently of the drawer)', () => {
    vi.mocked(notificationsService.getMyNotifications).mockResolvedValue({
      success: true,
      message: '',
      data: { items: [], count: 0 },
    })

    renderDrawer(false)
    expect(notificationsService.getMyNotifications).not.toHaveBeenCalledWith(expect.objectContaining({ page: '1' }))
  })

  it('fetches and renders full notification details when opened', async () => {
    vi.mocked(notificationsService.getMyNotifications).mockResolvedValue({
      success: true,
      message: '',
      data: { items: [itemFixture('a')], count: 1 },
    })

    renderDrawer(true)

    expect(await screen.findByText('Subject a')).toBeInTheDocument()
    expect(screen.getByText('Body a')).toBeInTheDocument()
    // 'full' variant shows the resolved entity label alongside the timestamp.
    expect(screen.getByText('Camp')).toBeInTheDocument()
    await waitFor(() =>
      expect(notificationsService.getMyNotifications).toHaveBeenCalledWith({ page: '1', limit: '10', read: undefined }),
    )
  })

  it('"All" is selected by default and shows both read and unread notifications', async () => {
    vi.mocked(notificationsService.getMyNotifications).mockResolvedValue({
      success: true,
      message: '',
      data: { items: [itemFixture('a', false), itemFixture('b', true)], count: 2 },
    })

    renderDrawer(true)

    expect(await screen.findByText('Subject a')).toBeInTheDocument()
    expect(screen.getByText('Subject b')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument()
  })

  it('clicking "Unread" re-queries with read=false and resets to page 1', async () => {
    vi.mocked(notificationsService.getMyNotifications).mockImplementation(async (query: SearchNotificationQuery) => {
      if (query.read === 'false') {
        return { success: true, message: '', data: { items: [itemFixture('unread-1', false)], count: 1 } }
      }
      return { success: true, message: '', data: { items: [itemFixture('a'), itemFixture('b', true)], count: 2 } }
    })

    const user = userEvent.setup()
    renderDrawer(true)

    await screen.findByText('Subject a')

    await user.click(screen.getByRole('button', { name: 'Unread' }))

    expect(await screen.findByText('Subject unread-1')).toBeInTheDocument()
    expect(screen.queryByText('Subject a')).not.toBeInTheDocument()
  })

  it('shows pagination controls and requests the next page on click', async () => {
    vi.mocked(notificationsService.getMyNotifications).mockImplementation(async (query: SearchNotificationQuery) => {
      if (query.page === '2') {
        return { success: true, message: '', data: { items: [itemFixture('page2-item')], count: 15 } }
      }
      return { success: true, message: '', data: { items: [itemFixture('page1-item')], count: 15 } }
    })

    const user = userEvent.setup()
    renderDrawer(true)

    await screen.findByText('Subject page1-item')
    expect(screen.getByText(/page 1 of 2/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^next$/i }))

    expect(await screen.findByText('Subject page2-item')).toBeInTheDocument()
  })

  it('clicking "Mark all read" calls the mutation', async () => {
    vi.mocked(notificationsService.getMyNotifications).mockResolvedValue({
      success: true,
      message: '',
      data: { items: [itemFixture('a', false)], count: 1 },
    })
    vi.mocked(notificationsService.markAllRead).mockResolvedValue({
      success: true, message: '', data: { modified: 1 },
    })

    const user = userEvent.setup()
    renderDrawer(true)

    await screen.findByText('Subject a')
    await user.click(screen.getByRole('button', { name: /mark all read/i }))

    await waitFor(() => expect(notificationsService.markAllRead).toHaveBeenCalledTimes(1))
  })

  it('disables "Mark all read" when there are no notifications', async () => {
    vi.mocked(notificationsService.getMyNotifications).mockResolvedValue({
      success: true,
      message: '',
      data: { items: [], count: 0 },
    })

    renderDrawer(true)

    await screen.findByText(/no notifications yet/i)
    expect(screen.getByRole('button', { name: /mark all read/i })).toBeDisabled()
  })

  it('disables "Mark all read" on the "All" filter once every notification is already read, even though the filtered count is nonzero', async () => {
    // Regression: the button must gate on the UNREAD count, not the "All" filter's total —
    // every row here is already read, so the feed's own `count` is 2, not 0.
    vi.mocked(notificationsService.getMyNotifications).mockImplementation(async (query: SearchNotificationQuery) => {
      if (query.read === 'false') {
        return { success: true, message: '', data: { items: [], count: 0 } }
      }
      return { success: true, message: '', data: { items: [itemFixture('a', true), itemFixture('b', true)], count: 2 } }
    })

    renderDrawer(true)

    await screen.findByText('Subject a')
    expect(screen.getByText('Subject b')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('button', { name: /mark all read/i })).toBeDisabled())
  })

  it('does not disable "Mark all read" when the unread-count query itself fails (unknown, not confirmed zero)', async () => {
    vi.mocked(notificationsService.getMyNotifications).mockImplementation(async (query: SearchNotificationQuery) => {
      if (query.read === 'false') {
        throw new Error('network error')
      }
      return { success: true, message: '', data: { items: [itemFixture('a', true)], count: 1 } }
    })

    renderDrawer(true)

    await screen.findByText('Subject a')
    expect(screen.getByRole('button', { name: /mark all read/i })).not.toBeDisabled()
  })

  it('shows an empty state scoped to the active filter', async () => {
    vi.mocked(notificationsService.getMyNotifications).mockResolvedValue({
      success: true,
      message: '',
      data: { items: [], count: 0 },
    })

    const user = userEvent.setup()
    renderDrawer(true)

    await screen.findByText(/no notifications yet/i)

    await user.click(screen.getByRole('button', { name: 'Unread' }))

    expect(await screen.findByText(/no unread notifications/i)).toBeInTheDocument()
  })

  it('a failed load shows a retryable error', async () => {
    vi.mocked(notificationsService.getMyNotifications).mockRejectedValue(new Error('network error'))

    renderDrawer(true)

    expect(await screen.findByText(/failed to load notifications/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })
})
