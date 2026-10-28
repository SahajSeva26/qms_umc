import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import useUnreadNotificationCount from './useUnreadNotificationCount'
import { notificationsService } from '@/features/notifications/notifications.service'

vi.mock('@/features/notifications/notifications.service', () => ({
  notificationsService: {
    getMyNotifications: vi.fn(),
  },
}))

function makeWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('useUnreadNotificationCount', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('requests only an unread, single-row page (badge is derived from count, not items.length)', async () => {
    vi.mocked(notificationsService.getMyNotifications).mockResolvedValue({
      success: true,
      message: '',
      data: { items: [{ id: 'a' } as never], count: 7 },
    })

    const { result } = renderHook(() => useUnreadNotificationCount(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.count).toBe(7))
    expect(notificationsService.getMyNotifications).toHaveBeenCalledWith({ read: 'false', limit: '1' })
  })

  it('defaults to 0 while loading or on no data', () => {
    vi.mocked(notificationsService.getMyNotifications).mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useUnreadNotificationCount(), { wrapper: makeWrapper() })

    expect(result.current.count).toBe(0)
    expect(result.current.isLoading).toBe(true)
  })
})
