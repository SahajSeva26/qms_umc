import type { ReactNode } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

vi.mock('@/lib/api/api', () => ({
  default: { get: vi.fn() },
}))

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

function profile(id: string) {
  return { id, tenant: 't', role: `r-${id}`, type: 'fo', status: 'active', coordinates: [0, 0], coverageRadius: 10, meta: {} }
}

describe('useFoGeoProfileSweep', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('does not fire any request when disabled', async () => {
    const api = (await import('@/lib/api/api')).default
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, message: '', data: { count: 0, items: [] } } })

    const { useFoGeoProfileSweep } = await import('./useFoGeoProfileSweep')
    const { result } = renderHook(() => useFoGeoProfileSweep(false), { wrapper })

    expect(result.current.fetchStatus).toBe('idle')
    expect(api.get).not.toHaveBeenCalled()
  })

  it('paginates until every fo geoProfile is fetched', async () => {
    const PAGE_SIZE = 200
    const api = (await import('@/lib/api/api')).default
    vi.mocked(api.get).mockImplementation(async (url: string, config?: { params?: { page?: string; type?: string } }) => {
      if (url === '/geo-profiles') {
        expect(config?.params?.type).toBe('fo')
        const page = config?.params?.page
        const items = page === '1'
          ? Array.from({ length: PAGE_SIZE }, (_, i) => profile(`p1-${i}`))
          : Array.from({ length: 5 }, (_, i) => profile(`p2-${i}`))
        return { data: { success: true, message: '', data: { count: PAGE_SIZE + 5, items } } }
      }
      throw new Error(`unexpected URL ${url}`)
    })

    const { useFoGeoProfileSweep } = await import('./useFoGeoProfileSweep')
    const { result } = renderHook(() => useFoGeoProfileSweep(true), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.length).toBe(PAGE_SIZE + 5)
  })
})
