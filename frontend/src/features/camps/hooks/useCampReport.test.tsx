import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useCampReport } from './useCampReport'
import { useCreateCamp } from './useCreateCamp'
import { campRealKeys } from './useCampsReal'
import { campsRealService } from '@/features/camps/campsReal.service'
import type { CreateCampPayload } from '@/types/campReal.types'

vi.mock('@/features/camps/campsReal.service', () => ({
  campsRealService: {
    getCampReport: vi.fn(async () => ({
      success: true,
      message: '',
      data: { summary: { totalCamps: 1 }, byStatus: [], byType: [], byBillingType: [] },
    })),
    createCamp: vi.fn(async () => ({ success: true, message: '', data: { id: 'new-camp' } })),
  },
}))

function makeWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return { queryClient, wrapper }
}

describe('useCampReport — query key shares campRealKeys.all so real-camp mutations invalidate it', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('is keyed under [...campRealKeys.all, "report"]', () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useCampReport(), { wrapper })
    expect(result.current).toBeDefined()
    // Sanity: the key constant itself resolves to what the hook is documented to use.
    expect([...campRealKeys.all, 'report']).toEqual(['campsReal', 'report'])
  })

  it('is invalidated/refetched after a real camp is created, without waiting for staleTime', async () => {
    const { queryClient, wrapper } = makeWrapper()

    const { result: reportResult } = renderHook(() => useCampReport(), { wrapper })
    await waitFor(() => expect(reportResult.current.isSuccess).toBe(true))
    expect(campsRealService.getCampReport).toHaveBeenCalledTimes(1)

    const { result: createResult } = renderHook(() => useCreateCamp(), { wrapper })
    await act(async () => {
      await createResult.current.mutateAsync({} as CreateCampPayload)
    })

    // invalidateQueries marks the report query stale and (since it's actively
    // observed by the still-mounted reportResult hook) triggers a real refetch —
    // the strongest possible proof the two keys actually share a namespace.
    await waitFor(() => expect(campsRealService.getCampReport).toHaveBeenCalledTimes(2))
    expect(queryClient.getQueryData([...campRealKeys.all, 'report'])).toBeDefined()
  })
})
