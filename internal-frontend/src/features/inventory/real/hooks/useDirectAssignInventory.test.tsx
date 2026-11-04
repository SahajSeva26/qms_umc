import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor, act } from '@testing-library/react'
import type { ReactNode } from 'react'
import { useInventoryAssignments } from '@/features/inventory/real/hooks/useInventoryAssignments'
import { useInventoryDevices } from '@/features/inventory/real/hooks/useInventoryDevices'
import { useInventoryConsumables } from '@/features/inventory/real/hooks/useInventoryConsumables'
import { useInventoryLedgers } from '@/features/inventory/real/hooks/useInventoryLedgers'

const searchInventoryAssignments = vi.fn<(query: unknown) => Promise<{ success: boolean; message: string; data: { items: unknown[]; count: number } }>>()
const directAssign = vi.fn<(fo: unknown, payload: unknown) => Promise<{ success: boolean; message: string; data: { items: unknown[]; count: number } }>>()
vi.mock('@/features/inventory/real/inventoryAssignment.service', () => ({
  inventoryAssignmentService: {
    searchInventoryAssignments: (query: unknown) => searchInventoryAssignments(query),
    directAssign: (fo: unknown, payload: unknown) => directAssign(fo, payload),
  },
}))

const searchInventoryDevices = vi.fn<(query: unknown) => Promise<{ success: boolean; message: string; data: { items: unknown[]; count: number } }>>()
vi.mock('@/features/inventory/real/inventoryDevice.service', () => ({
  inventoryDeviceService: { searchInventoryDevices: (query: unknown) => searchInventoryDevices(query) },
}))

const searchInventoryConsumables = vi.fn<(query: unknown) => Promise<{ success: boolean; message: string; data: { items: unknown[]; count: number } }>>()
vi.mock('@/features/inventory/real/inventoryConsumable.service', () => ({
  inventoryConsumableService: { searchInventoryConsumables: (query: unknown) => searchInventoryConsumables(query) },
}))

const searchInventoryLedgers = vi.fn<(query: unknown) => Promise<{ success: boolean; message: string; data: { items: unknown[]; count: number } }>>()
vi.mock('@/features/inventory/real/inventoryLedger.service', () => ({
  inventoryLedgerService: { searchInventoryLedgers: (query: unknown) => searchInventoryLedgers(query) },
}))

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

// A direct assignment flips device status, pulls consumable lots (FEFO), writes a ledger
// row, AND creates/updates an assignment row — all 4 mounted list queries must refetch.
describe('useDirectAssignInventory — cache invalidation', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    searchInventoryAssignments.mockResolvedValue({ success: true, message: '', data: { items: [], count: 0 } })
    searchInventoryDevices.mockResolvedValue({ success: true, message: '', data: { items: [], count: 0 } })
    searchInventoryConsumables.mockResolvedValue({ success: true, message: '', data: { items: [], count: 0 } })
    searchInventoryLedgers.mockResolvedValue({ success: true, message: '', data: { items: [], count: 0 } })
    directAssign.mockResolvedValue({ success: true, message: '', data: { items: [], count: 3 } })
  })

  it('refetches mounted Assignment, Device, Consumable, and Ledger list queries on success', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const wrapper = makeWrapper(queryClient)

    const { result: assignmentsResult } = renderHook(() => useInventoryAssignments({}), { wrapper })
    const { result: devicesResult } = renderHook(() => useInventoryDevices({}), { wrapper })
    const { result: consumablesResult } = renderHook(() => useInventoryConsumables({}), { wrapper })
    const { result: ledgersResult } = renderHook(() => useInventoryLedgers({}), { wrapper })
    await waitFor(() => expect(assignmentsResult.current.isSuccess).toBe(true))
    await waitFor(() => expect(devicesResult.current.isSuccess).toBe(true))
    await waitFor(() => expect(consumablesResult.current.isSuccess).toBe(true))
    await waitFor(() => expect(ledgersResult.current.isSuccess).toBe(true))
    expect(searchInventoryAssignments).toHaveBeenCalledTimes(1)
    expect(searchInventoryDevices).toHaveBeenCalledTimes(1)
    expect(searchInventoryConsumables).toHaveBeenCalledTimes(1)
    expect(searchInventoryLedgers).toHaveBeenCalledTimes(1)

    const { useDirectAssignInventory } = await import('@/features/inventory/real/hooks/useDirectAssignInventory')
    const { result: mutationResult } = renderHook(() => useDirectAssignInventory(), { wrapper })

    await act(async () => {
      await mutationResult.current.mutateAsync({ fo: 'fo-1', payload: { devices: ['dev-1'] } })
    })

    expect(directAssign).toHaveBeenCalledWith('fo-1', { devices: ['dev-1'] })
    await waitFor(() => expect(searchInventoryAssignments).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(searchInventoryDevices).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(searchInventoryConsumables).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(searchInventoryLedgers).toHaveBeenCalledTimes(2))
  })

  it('does not invalidate anything when the mutation fails', async () => {
    directAssign.mockRejectedValue(new Error('short stock'))
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const wrapper = makeWrapper(queryClient)

    const { result: assignmentsResult } = renderHook(() => useInventoryAssignments({}), { wrapper })
    await waitFor(() => expect(assignmentsResult.current.isSuccess).toBe(true))
    expect(searchInventoryAssignments).toHaveBeenCalledTimes(1)

    const { useDirectAssignInventory } = await import('@/features/inventory/real/hooks/useDirectAssignInventory')
    const { result: mutationResult } = renderHook(() => useDirectAssignInventory(), { wrapper })

    await act(async () => {
      await mutationResult.current.mutateAsync({ fo: 'fo-1', payload: { devices: ['dev-1'] } }).catch(() => {})
    })

    await waitFor(() => expect(mutationResult.current.isError).toBe(true))
    // No invalidation fires on a failed mutation.
    expect(searchInventoryAssignments).toHaveBeenCalledTimes(1)
  })
})
