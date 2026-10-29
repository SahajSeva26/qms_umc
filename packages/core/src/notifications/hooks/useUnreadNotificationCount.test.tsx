import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import type { AxiosInstance } from 'axios'
import { useUnreadNotificationCount } from './useUnreadNotificationCount'

function makeApi(): AxiosInstance {
  return { get: vi.fn() } as unknown as AxiosInstance
}

function makeWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('useUnreadNotificationCount', () => {
  let api: AxiosInstance

  beforeEach(() => {
    api = makeApi()
  })

  it('requests only an unread, single-row page (badge is derived from count, not items.length)', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { success: true, message: '', data: { items: [{ id: 'a' }], count: 7 } },
    })

    const { result } = renderHook(() => useUnreadNotificationCount(api), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.count).toBe(7))
    expect(api.get).toHaveBeenCalledWith('/notifications/me', { params: { read: 'false', limit: '1' } })
  })

  it('defaults to 0 while loading or on no data', () => {
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useUnreadNotificationCount(api), { wrapper: makeWrapper() })

    expect(result.current.count).toBe(0)
    expect(result.current.isLoading).toBe(true)
  })
})
