import type { ReactNode } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

vi.mock('@/lib/api/api', () => ({
  default: { get: vi.fn() },
}))

// Mirrors the app's actual default (lib/api/queryClient.ts's retry:1), NOT a test-only
// retry:false — this proves the hook's own retry:false wins, not that the test hid the bug.
function wrapperWithAppDefaultRetry({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1 } } })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('useLeadReport', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('never automatically retries a failed request, even under the app-wide retry:1 default', async () => {
    const api = (await import('@/lib/api/api')).default
    vi.mocked(api.get).mockRejectedValue(new Error('network error'))

    const { useLeadReport } = await import('./useLeadReport')
    const { result } = renderHook(() => useLeadReport({}, true), { wrapper: wrapperWithAppDefaultRetry })
    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(api.get).toHaveBeenCalledTimes(1)
  })

  it('exposes refetch so the existing manual Retry action still works', async () => {
    const api = (await import('@/lib/api/api')).default
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, message: '', data: { summary: { totalLeads: 0, converted: 0, lost: 0, open: 0 } } } })

    const { useLeadReport } = await import('./useLeadReport')
    const { result } = renderHook(() => useLeadReport({}, true), { wrapper: wrapperWithAppDefaultRetry })
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(typeof result.current.refetch).toBe('function')
  })
})
