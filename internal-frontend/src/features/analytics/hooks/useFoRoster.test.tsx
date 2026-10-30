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

describe('useFoRoster', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('does not fire any request when disabled (caller lacks inventory-assignment:manage)', async () => {
    const api = (await import('@/lib/api/api')).default
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, message: '', data: { fieldOfficers: [], summary: { totalFieldOfficers: 0, fieldOfficersHoldingInventory: 0 } } } })

    const { useFoRoster } = await import('./useFoRoster')
    const { result } = renderHook(() => useFoRoster(false), { wrapper })

    expect(result.current.fetchStatus).toBe('idle')
    expect(api.get).not.toHaveBeenCalled()
  })

  it('fetches the single-request org-wide roster when enabled', async () => {
    const api = (await import('@/lib/api/api')).default
    vi.mocked(api.get).mockResolvedValue({
      data: {
        success: true, message: '',
        data: {
          summary: { totalFieldOfficers: 2, fieldOfficersHoldingInventory: 1 },
          fieldOfficers: [
            { role: 'r1', name: 'Ravi', code: 'FO-1', devicesHeld: 2, consumableUnitsHeld: 0, awaitingApproval: 0, awaitingReceipt: 0 },
          ],
        },
      },
    })

    const { useFoRoster } = await import('./useFoRoster')
    const { result } = renderHook(() => useFoRoster(true), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(api.get).toHaveBeenCalledTimes(1)
    expect(vi.mocked(api.get).mock.calls[0][0]).toBe('/inventory-assignments/report')
    expect(result.current.data?.data?.summary.totalFieldOfficers).toBe(2)
  })
})
