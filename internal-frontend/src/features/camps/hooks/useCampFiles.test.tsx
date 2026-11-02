import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { useCampFiles } from './useCampFiles'
import { campsRealService } from '@/features/camps/campsReal.service'

vi.mock('@/features/camps/campsReal.service', () => ({
  campsRealService: { getCampFiles: vi.fn() },
}))

function wrapper(client: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}

describe('useCampFiles — refetch error propagation', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  // TanStack's own refetch() normally RESOLVES even when the underlying request failed — it
  // reports the failure via the returned result's own `status`/`error` fields, not a rejection.
  // A caller that just does `await refetch()` and assumes success on no-throw (as
  // useCampFileUpload.ts's doRefresh does) would silently treat a failed refresh as successful
  // without throwOnError. This test proves our refetch() genuinely rejects instead.
  it('refetch() rejects (not just resolves with an error result) when the query itself fails', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    vi.mocked(campsRealService.getCampFiles).mockRejectedValue(new Error('network error'))

    const { result } = renderHook(() => useCampFiles('camp-1', 'setup'), { wrapper: wrapper(client) })
    await waitFor(() => expect(result.current.isError).toBe(true))

    await expect(result.current.refetch()).rejects.toThrow('network error')
  })

  it('refetch() resolves normally when the query succeeds', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    vi.mocked(campsRealService.getCampFiles).mockResolvedValue({
      success: true, message: '', data: { items: [], count: 0 },
    } as never)

    const { result } = renderHook(() => useCampFiles('camp-1', 'setup'), { wrapper: wrapper(client) })
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await expect(result.current.refetch()).resolves.toBeDefined()
  })
})
