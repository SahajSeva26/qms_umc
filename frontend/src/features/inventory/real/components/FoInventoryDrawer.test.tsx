import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import type { InventoryAssignmentEntity } from '@/types/inventoryAssignment.types'

const useInventoryAssignments = vi.fn()
const getInventoryDevice = vi.fn()
const getInventoryConsumable = vi.fn()

vi.mock('@/features/inventory/real/hooks/useInventoryAssignments', () => ({
  useInventoryAssignments: (...args: unknown[]) => useInventoryAssignments(...args),
}))

vi.mock('@/features/inventory/real/inventoryDevice.service', () => ({
  inventoryDeviceService: {
    getInventoryDevice: (...args: unknown[]) => getInventoryDevice(...args),
  },
}))

vi.mock('@/features/inventory/real/inventoryConsumable.service', () => ({
  inventoryConsumableService: {
    getInventoryConsumable: (...args: unknown[]) => getInventoryConsumable(...args),
  },
}))

vi.mock('@/components/ui/SideDrawer', () => ({
  default: ({ open, title, children }: { open: boolean; title: string; children: ReactNode }) => open ? <section aria-label={title}>{children}</section> : null,
}))

const makeAssignment = (inventoryType: InventoryAssignmentEntity['inventoryType'], id: string): InventoryAssignmentEntity => ({
  id: `assignment-${id}`,
  assignee: { id: 'fo-1', name: 'Asha Field Officer', code: 'FO-001' },
  inventoryType,
  inventory: inventoryType === 'InventoryDevice'
    ? { id, serialNumber: `SN-${id}`, status: 'assigned' }
    : { id, batch: `BATCH-${id}`, expiryDate: '2027-01-15T00:00:00.000Z' },
  quantity: inventoryType === 'InventoryDevice' ? 1 : 20,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
})

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

async function renderDrawer() {
  const FoInventoryDrawer = (await import('@/features/inventory/real/components/FoInventoryDrawer')).default
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <FoInventoryDrawer open foRoleId="fo-1" foName="Asha Field Officer" foCode="FO-001" onClose={() => {}} />
    </QueryClientProvider>,
  )
}

describe('FoInventoryDrawer', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    useInventoryAssignments.mockImplementation((query: { inventoryType: InventoryAssignmentEntity['inventoryType']; page: string }) => {
      const pageTwo = query.page === '2'
      const id = query.inventoryType === 'InventoryDevice'
        ? pageTwo ? 'device-2' : 'device-1'
        : pageTwo ? 'consumable-2' : 'consumable-1'

      return {
        data: {
          success: true,
          message: '',
          data: { count: 11, items: [makeAssignment(query.inventoryType, id)] },
        },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      }
    })
    getInventoryDevice.mockImplementation(async (id: string) => ({
      success: true,
      message: '',
      data: { id, item: { id: 'master-device', name: 'Glucometer' }, vendor: null, serialNumber: `SN-${id}`, status: 'assigned' },
    }))
    getInventoryConsumable.mockImplementation(async (id: string) => ({
      success: true,
      message: '',
      data: { id, item: { id: 'master-consumable', name: 'Lancets' }, vendor: null, batch: `BATCH-${id}`, manufacturingDate: '2026-01-01T00:00:00.000Z', quantity: 20 },
    }))
  })

  it('uses ten-row assignment pages and only resolves inventory for the visible device page', async () => {
    await renderDrawer()

    await waitFor(() => {
      expect(useInventoryAssignments).toHaveBeenCalledWith(
        expect.objectContaining({ assignee: 'fo-1', inventoryType: 'InventoryDevice', page: '1', limit: '10' }),
        true,
      )
      expect(getInventoryDevice).toHaveBeenCalledWith('device-1')
      expect(getInventoryConsumable).toHaveBeenCalledWith('consumable-1')
    })

    fireEvent.click((await screen.findAllByRole('button', { name: /next/i }))[0])

    await waitFor(() => {
      expect(useInventoryAssignments).toHaveBeenCalledWith(
        expect.objectContaining({ inventoryType: 'InventoryDevice', page: '2', limit: '10' }),
        true,
      )
      expect(getInventoryDevice).toHaveBeenCalledWith('device-2')
    })
  })

  it('paginates the Consumables table independently of Devices — Next there advances only the consumable page', async () => {
    await renderDrawer()

    await waitFor(() => {
      expect(getInventoryDevice).toHaveBeenCalledWith('device-1')
      expect(getInventoryConsumable).toHaveBeenCalledWith('consumable-1')
    })

    // index 1 — Devices' own "Next" is index 0, confirmed by the sibling test above.
    fireEvent.click((await screen.findAllByRole('button', { name: /next/i }))[1])

    await waitFor(() => {
      expect(useInventoryAssignments).toHaveBeenCalledWith(
        expect.objectContaining({ inventoryType: 'InventoryConsumable', page: '2', limit: '10' }),
        true,
      )
      expect(getInventoryConsumable).toHaveBeenCalledWith('consumable-2')
    })

    // Devices stayed on its own page 1 — the two tables' pagination never crossed over.
    expect(useInventoryAssignments).not.toHaveBeenCalledWith(
      expect.objectContaining({ inventoryType: 'InventoryDevice', page: '2' }),
      true,
    )
    expect(getInventoryDevice).not.toHaveBeenCalledWith('device-2')
  })
})
