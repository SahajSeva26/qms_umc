import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor, act } from '@testing-library/react'
import type { ReactNode } from 'react'
import useNotificationFeed, { notificationFeedKey } from './useNotificationFeed'
import { notificationsService } from '@/features/notifications/notifications.service'
import type { NotificationEntityItem, SearchNotificationQuery } from '@/features/notifications/notifications.types'

vi.mock('@/features/notifications/notifications.service', () => ({
  notificationsService: {
    getMyNotifications: vi.fn(),
  },
}))

function makeWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return { Wrapper: ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>, queryClient }
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

function page(items: NotificationEntityItem[], count: number) {
  return { success: true, message: '', data: { items, count } }
}

// A simple two-page fixture server: page 1 has 2 items, page 2 has 2 more, count is 4.
function byPageMock(itemsByPage: Record<string, NotificationEntityItem[]>, count: number) {
  return vi.fn(async (query: SearchNotificationQuery) => page(itemsByPage[query.page ?? '1'] ?? [], count))
}

describe('useNotificationFeed', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('does not fetch while disabled (popover closed)', () => {
    const { Wrapper } = makeWrapper()
    renderHook(() => useNotificationFeed(false), { wrapper: Wrapper })
    expect(notificationsService.getMyNotifications).not.toHaveBeenCalled()
  })

  it('fetches page 1 (limit 10) once enabled, and populates items from it', async () => {
    vi.mocked(notificationsService.getMyNotifications).mockImplementation(
      byPageMock({ '1': [itemFixture('a'), itemFixture('b')] }, 25),
    )

    const { Wrapper } = makeWrapper()
    const { result } = renderHook(() => useNotificationFeed(true), { wrapper: Wrapper })

    await waitFor(() => expect(result.current.items).toHaveLength(2))
    expect(notificationsService.getMyNotifications).toHaveBeenCalledWith({ page: '1', limit: '10' })
    expect(result.current.count).toBe(25)
    expect(result.current.hasMore).toBe(true)
  })

  it('loadMore appends page 2 items after page 1, without duplicating page 1', async () => {
    vi.mocked(notificationsService.getMyNotifications).mockImplementation(
      byPageMock(
        { '1': [itemFixture('a'), itemFixture('b')], '2': [itemFixture('c'), itemFixture('d')] },
        4,
      ),
    )

    const { Wrapper } = makeWrapper()
    const { result } = renderHook(() => useNotificationFeed(true), { wrapper: Wrapper })
    await waitFor(() => expect(result.current.items).toHaveLength(2))

    act(() => {
      result.current.loadMore()
    })

    await waitFor(() => expect(result.current.items).toHaveLength(4))
    expect(result.current.items.map((i) => i.id)).toEqual(['a', 'b', 'c', 'd'])
    expect(notificationsService.getMyNotifications).toHaveBeenCalledWith({ page: '2', limit: '10' })
    expect(result.current.hasMore).toBe(false)
  })

  it('loadMore is a no-op once hasMore is false', async () => {
    vi.mocked(notificationsService.getMyNotifications).mockImplementation(byPageMock({ '1': [itemFixture('a')] }, 1))
    const { Wrapper } = makeWrapper()
    const { result } = renderHook(() => useNotificationFeed(true), { wrapper: Wrapper })
    await waitFor(() => expect(result.current.hasMore).toBe(false))

    const callsBefore = vi.mocked(notificationsService.getMyNotifications).mock.calls.length
    act(() => {
      result.current.loadMore()
    })

    expect(vi.mocked(notificationsService.getMyNotifications).mock.calls.length).toBe(callsBefore)
  })

  // useInfiniteQuery must refetch every already-loaded page together on invalidation.
  it('invalidating the query key refetches every already-loaded page, not just the last one', async () => {
    vi.mocked(notificationsService.getMyNotifications).mockImplementation(
      byPageMock(
        { '1': [itemFixture('a', false)], '2': [itemFixture('b', false)] },
        2,
      ),
    )

    const { Wrapper, queryClient } = makeWrapper()
    const { result } = renderHook(() => useNotificationFeed(true), { wrapper: Wrapper })
    await waitFor(() => expect(result.current.items).toHaveLength(1))

    act(() => {
      result.current.loadMore()
    })
    await waitFor(() => expect(result.current.items).toHaveLength(2))
    expect(result.current.items.every((i) => !i.read)).toBe(true)

    // simulate the server now reporting both rows read, then invalidate (as mark-all-read does)
    vi.mocked(notificationsService.getMyNotifications).mockImplementation(
      byPageMock(
        { '1': [itemFixture('a', true)], '2': [itemFixture('b', true)] },
        2,
      ),
    )
    await act(async () => {
      await queryClient.invalidateQueries({ queryKey: notificationFeedKey })
    })

    await waitFor(() => expect(result.current.items.every((i) => i.read)).toBe(true))
    expect(result.current.items).toHaveLength(2) // both pages' items are still present
  })

  it('a retry of page 1 (same page) replaces, not duplicates, the list', async () => {
    const mock = byPageMock({ '1': [itemFixture('a'), itemFixture('b')] }, 5)
    vi.mocked(notificationsService.getMyNotifications).mockImplementation(mock)

    const { Wrapper } = makeWrapper()
    const { result } = renderHook(() => useNotificationFeed(true), { wrapper: Wrapper })
    await waitFor(() => expect(result.current.items).toHaveLength(2))

    await act(async () => {
      await result.current.refetch()
    })

    await waitFor(() => expect(result.current.items).toHaveLength(2))
    expect(result.current.items.map((i) => i.id)).toEqual(['a', 'b'])
  })

  it('resets to page 1 when disabled (popover closes) and re-enabled', async () => {
    vi.mocked(notificationsService.getMyNotifications).mockImplementation(
      byPageMock(
        { '1': [itemFixture('a'), itemFixture('b')], '2': [itemFixture('c'), itemFixture('d')] },
        4,
      ),
    )
    const { Wrapper } = makeWrapper()
    const { result, rerender } = renderHook(({ enabled }) => useNotificationFeed(enabled), {
      wrapper: Wrapper,
      initialProps: { enabled: true },
    })
    await waitFor(() => expect(result.current.items).toHaveLength(2))

    act(() => {
      result.current.loadMore()
    })
    await waitFor(() => expect(result.current.items).toHaveLength(4))

    rerender({ enabled: false }) // close — query disabled, cache kept
    rerender({ enabled: true }) // reopen — same cache, pages 1+2 still present

    await waitFor(() => expect(result.current.items.map((i) => i.id)).toEqual(['a', 'b', 'c', 'd']))
  })
})
