import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor, act } from '@testing-library/react'
import type { ReactNode } from 'react'
import { useInventoryDevices } from '@/features/inventory/real/hooks/useInventoryDevices'
import { useInventoryConsumables } from '@/features/inventory/real/hooks/useInventoryConsumables'
import { useInventoryAssignments } from '@/features/inventory/real/hooks/useInventoryAssignments'

const searchInventoryMasters = vi.fn<(query: unknown) => Promise<{ success: boolean; message: string; data: { items: unknown[]; count: number } }>>()
const updateInventoryMaster = vi.fn<(id: unknown, payload: unknown) => Promise<{ success: boolean; message: string; data: { id: string } }>>()
vi.mock('@/features/inventory/real/inventoryMaster.service', () => ({
  inventoryMasterService: {
    searchInventoryMasters: (query: unknown) => searchInventoryMasters(query),
    updateInventoryMaster: (id: unknown, payload: unknown) => updateInventoryMaster(id, payload),
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

const searchInventoryAssignments = vi.fn<(query: unknown) => Promise<{ success: boolean; message: string; data: { items: unknown[]; count: number } }>>()
vi.mock('@/features/inventory/real/inventoryAssignment.service', () => ({
  inventoryAssignmentService: { searchInventoryAssignments: (query: unknown) => searchInventoryAssignments(query) },
}))

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

// Assignments never displays a catalog name, so it must NOT be invalidated — catches an over-eager fix too.
describe('useUpdateInventoryMaster — cache invalidation', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    searchInventoryMasters.mockResolvedValue({ success: true, message: '', data: { items: [], count: 0 } })
    updateInventoryMaster.mockResolvedValue({ success: true, message: '', data: { id: 'm1' } })
    searchInventoryDevices.mockResolvedValue({ success: true, message: '', data: { items: [], count: 0 } })
    searchInventoryConsumables.mockResolvedValue({ success: true, message: '', data: { items: [], count: 0 } })
    searchInventoryAssignments.mockResolvedValue({ success: true, message: '', data: { items: [], count: 0 } })
  })

  it('refetches mounted Devices and Consumables list queries on a successful master update', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const wrapper = makeWrapper(queryClient)

    const { result: devicesResult } = renderHook(() => useInventoryDevices({}), { wrapper })
    const { result: consumablesResult } = renderHook(() => useInventoryConsumables({}), { wrapper })
    await waitFor(() => expect(devicesResult.current.isSuccess).toBe(true))
    await waitFor(() => expect(consumablesResult.current.isSuccess).toBe(true))
    expect(searchInventoryDevices).toHaveBeenCalledTimes(1)
    expect(searchInventoryConsumables).toHaveBeenCalledTimes(1)

    const { useUpdateInventoryMaster } = await import('@/features/inventory/real/hooks/useUpdateInventoryMaster')
    const { result: updateResult } = renderHook(() => useUpdateInventoryMaster('m1'), { wrapper })

    await act(async () => {
      await updateResult.current.mutateAsync({ name: 'Renamed Item' })
    })

    await waitFor(() => expect(searchInventoryDevices).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(searchInventoryConsumables).toHaveBeenCalledTimes(2))
  })

  it('does NOT refetch a mounted Assignments list query on a master update (it never displays a catalog name)', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const wrapper = makeWrapper(queryClient)

    const { result: assignmentsResult } = renderHook(() => useInventoryAssignments({}), { wrapper })
    await waitFor(() => expect(assignmentsResult.current.isSuccess).toBe(true))
    expect(searchInventoryAssignments).toHaveBeenCalledTimes(1)

    const { useUpdateInventoryMaster } = await import('@/features/inventory/real/hooks/useUpdateInventoryMaster')
    const { result: updateResult } = renderHook(() => useUpdateInventoryMaster('m1'), { wrapper })

    await act(async () => {
      await updateResult.current.mutateAsync({ name: 'Renamed Item' })
    })

    // Give any incorrect invalidation a chance to fire before asserting its absence.
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(searchInventoryAssignments).toHaveBeenCalledTimes(1)
  })
})
