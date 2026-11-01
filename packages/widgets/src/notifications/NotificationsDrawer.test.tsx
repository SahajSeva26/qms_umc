import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { AxiosInstance } from 'axios'
import { FiBox } from 'react-icons/fi'
import type { NotificationEntityItem } from '@qms/core'
import NotificationsDrawer from './NotificationsDrawer'
import type { EntityResolution } from './notifications.entityResolver'

function makeApi(): AxiosInstance {
  return { get: vi.fn(), patch: vi.fn() } as unknown as AxiosInstance
}

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

const resolveEntity = () => ({ icon: FiBox, label: 'Camp', href: (id: string) => `/camps?camp=${id}` }) as EntityResolution

function renderDrawer(api: AxiosInstance, open = true, onClose = vi.fn()) {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <NotificationsDrawer api={api} open={open} onClose={onClose} resolveEntity={resolveEntity} onNavigate={vi.fn()} />
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

describe('NotificationsDrawer', () => {
  let api: AxiosInstance

  beforeEach(() => {
    api = makeApi()
  })

  it('does not fetch the paged feed while closed (the unread-count query runs independently of the drawer)', () => {
    vi.mocked(api.get).mockResolvedValue(pageResponse([], 0))

    renderDrawer(api, false)
    expect(api.get).not.toHaveBeenCalledWith('/notifications/me', expect.objectContaining({ params: expect.objectContaining({ page: '1' }) }))
  })

  it('fetches and renders full notification details when opened', async () => {
    vi.mocked(api.get).mockResolvedValue(pageResponse([itemFixture('a')], 1))

    renderDrawer(api, true)

    expect(await screen.findByText('Subject a')).toBeInTheDocument()
    expect(screen.getByText('Body a')).toBeInTheDocument()
    // 'full' variant shows the resolved entity label alongside the timestamp.
    expect(screen.getByText('Camp')).toBeInTheDocument()
    await waitFor(() =>
      expect(api.get).toHaveBeenCalledWith('/notifications/me', { params: { page: '1', limit: '10', read: undefined } }),
    )
  })

  it('"All" is selected by default and shows both read and unread notifications', async () => {
    vi.mocked(api.get).mockResolvedValue(pageResponse([itemFixture('a', false), itemFixture('b', true)], 2))

    renderDrawer(api, true)

    expect(await screen.findByText('Subject a')).toBeInTheDocument()
    expect(screen.getByText('Subject b')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument()
  })

  it('clicking "Unread" re-queries with read=false and resets to page 1', async () => {
    vi.mocked(api.get).mockImplementation(async (_url: string, config: { params: { read?: string } }) => {
      if (config.params.read === 'false') return pageResponse([itemFixture('unread-1', false)], 1)
      return pageResponse([itemFixture('a'), itemFixture('b', true)], 2)
    })

    const user = userEvent.setup()
    renderDrawer(api, true)

    await screen.findByText('Subject a')

    await user.click(screen.getByRole('button', { name: 'Unread' }))

    expect(await screen.findByText('Subject unread-1')).toBeInTheDocument()
    expect(screen.queryByText('Subject a')).not.toBeInTheDocument()
  })

  it('shows pagination controls and requests the next page on click', async () => {
    vi.mocked(api.get).mockImplementation(async (_url: string, config: { params: { page?: string } }) => {
      if (config.params.page === '2') return pageResponse([itemFixture('page2-item')], 15)
      return pageResponse([itemFixture('page1-item')], 15)
    })

    const user = userEvent.setup()
    renderDrawer(api, true)

    await screen.findByText('Subject page1-item')
    expect(screen.getByText(/page 1 of 2/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^next$/i }))

    expect(await screen.findByText('Subject page2-item')).toBeInTheDocument()
  })

  it('clicking "Mark all read" calls the mutation', async () => {
    vi.mocked(api.get).mockResolvedValue(pageResponse([itemFixture('a', false)], 1))
    vi.mocked(api.patch).mockResolvedValue({ data: { success: true, message: '', data: { modified: 1 } } })

    const user = userEvent.setup()
    renderDrawer(api, true)

    await screen.findByText('Subject a')
    await user.click(screen.getByRole('button', { name: /mark all read/i }))

    await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/notifications/me/read'))
  })

  it('disables "Mark all read" when there are no notifications', async () => {
    vi.mocked(api.get).mockResolvedValue(pageResponse([], 0))

    renderDrawer(api, true)

    await screen.findByText(/no notifications yet/i)
    expect(screen.getByRole('button', { name: /mark all read/i })).toBeDisabled()
  })

  it('disables "Mark all read" on the "All" filter once every notification is already read, even though the filtered count is nonzero', async () => {
    // Regression: the button must gate on the UNREAD count, not the "All" filter's total —
    // every row here is already read, so the feed's own `count` is 2, not 0.
    vi.mocked(api.get).mockImplementation(async (_url: string, config: { params: { read?: string } }) => {
      if (config.params.read === 'false') return pageResponse([], 0)
      return pageResponse([itemFixture('a', true), itemFixture('b', true)], 2)
    })

    renderDrawer(api, true)

    await screen.findByText('Subject a')
    expect(screen.getByText('Subject b')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('button', { name: /mark all read/i })).toBeDisabled())
  })

  it('does not disable "Mark all read" when the unread-count query itself fails (unknown, not confirmed zero)', async () => {
    vi.mocked(api.get).mockImplementation(async (_url: string, config: { params: { read?: string } }) => {
      if (config.params.read === 'false') throw new Error('network error')
      return pageResponse([itemFixture('a', true)], 1)
    })

    renderDrawer(api, true)

    await screen.findByText('Subject a')
    expect(screen.getByRole('button', { name: /mark all read/i })).not.toBeDisabled()
  })

  it('shows an empty state scoped to the active filter', async () => {
    vi.mocked(api.get).mockResolvedValue(pageResponse([], 0))

    const user = userEvent.setup()
    renderDrawer(api, true)

    await screen.findByText(/no notifications yet/i)

    await user.click(screen.getByRole('button', { name: 'Unread' }))

    expect(await screen.findByText(/no unread notifications/i)).toBeInTheDocument()
  })

  it('a failed load shows a retryable error', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('network error'))

    renderDrawer(api, true)

    expect(await screen.findByText(/failed to load notifications/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })
})
