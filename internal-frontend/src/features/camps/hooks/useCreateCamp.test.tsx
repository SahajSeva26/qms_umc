import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { useCreateCamp } from '@/features/camps/hooks/useCreateCamp'
import { CAMP_QUERY_NAMESPACES } from '@/types/campQueryKeys'

vi.mock('@/features/camps/campsReal.service', () => ({
  campsRealService: {
    createCamp: vi.fn(async () => ({ success: true, message: '', data: { id: 'camp-1', code: 'cmp-000001' } })),
  },
}))

function makeWrapper(queryClient: QueryClient) {
  return ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('useCreateCamp', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('invalidates both the internal and pharma camp-list namespaces on success, since they read the same backend records', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useCreateCamp(), { wrapper: makeWrapper(queryClient) })

    result.current.mutate({} as never)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: [CAMP_QUERY_NAMESPACES.internal] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: [CAMP_QUERY_NAMESPACES.pharma] })
  })
})
