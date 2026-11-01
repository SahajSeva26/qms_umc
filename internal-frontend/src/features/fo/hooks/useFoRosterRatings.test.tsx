import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'

vi.mock('@/lib/api/api', () => ({
  default: { get: vi.fn() },
}))

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

function rating(id: string, overall: number, onTime = overall, attire = overall, communication = overall) {
  return { id, overall, onTime, attire, communication }
}

describe('useFoRosterRatings', () => {
  beforeEach(() => vi.resetAllMocks())

  it('does not request ratings when the viewer lacks rating:search/manage', async () => {
    const api = (await import('@/lib/api/api')).default
    const { useFoRosterRatings } = await import('./useFoRosterRatings')
    const { result } = renderHook(() => useFoRosterRatings(['fo-1'], false), { wrapper })

    expect(result.current).toEqual({})
    expect(api.get).not.toHaveBeenCalled()
  })

  it('fetches every page and computes the exact mean of backend-derived overall scores', async () => {
    const api = (await import('@/lib/api/api')).default
    vi.mocked(api.get).mockImplementation(async (_url: string, config?: { params?: { page?: string; worker?: string } }) => {
      const page = config?.params?.page
      const items = page === '1'
        ? Array.from({ length: 50 }, (_, index) => rating(`p1-${index}`, 4))
        : [rating('p2-1', 5, 4, 3, 2), rating('p2-2', 5, 4, 3, 2)]
      return { data: { success: true, message: '', data: { count: 52, items } } }
    })

    const { useFoRosterRatings } = await import('./useFoRosterRatings')
    const { result } = renderHook(() => useFoRosterRatings(['fo-1'], true), { wrapper })
    await waitFor(() => expect(result.current['fo-1']?.isLoading).toBe(false))

    expect(result.current['fo-1']).toMatchObject({
      average: 4,
      onTimeAverage: 4,
      attireAverage: 4,
      communicationAverage: 3.9,
      count: 52,
      error: null,
    })
    expect(vi.mocked(api.get).mock.calls.map(([, config]) => config?.params)).toEqual(expect.arrayContaining([
      expect.objectContaining({ worker: 'fo-1', page: '1', limit: '50' }),
      expect.objectContaining({ worker: 'fo-1', page: '2', limit: '50' }),
    ]))
  })

  it('keeps a failed ratings request distinct from an unrated FO', async () => {
    const api = (await import('@/lib/api/api')).default
    vi.mocked(api.get).mockRejectedValue(new Error('ratings unavailable'))

    const { useFoRosterRatings } = await import('./useFoRosterRatings')
    const { result } = renderHook(() => useFoRosterRatings(['fo-1'], true), { wrapper })
    await waitFor(() => expect(result.current['fo-1']?.error).toBeTruthy())

    expect(result.current['fo-1'].average).toBeNull()
    expect(result.current['fo-1'].onTimeAverage).toBeNull()
    expect(result.current['fo-1'].attireAverage).toBeNull()
    expect(result.current['fo-1'].communicationAverage).toBeNull()
    expect(result.current['fo-1'].count).toBe(0)
  })
})
