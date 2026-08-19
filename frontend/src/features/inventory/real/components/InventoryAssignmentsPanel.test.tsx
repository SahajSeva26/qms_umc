import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'

vi.mock('@/hooks/usePermission')

vi.mock('@/features/inventory/real/inventoryAssignment.service', () => ({
  inventoryAssignmentService: {
    searchInventoryAssignments: vi.fn(async () => ({
      success: true,
      message: '',
      data: {
        count: 1,
        items: [
          {
            id: 'asn-1',
            assignee: { id: 'role-1', name: 'Jane FO', code: 'fo-1' },
            inventoryType: 'InventoryDevice',
            inventory: { id: 'dev-1', serialNumber: 'SN-001', status: 'assigned' },
            quantity: 1,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      },
    })),
  },
}))

vi.mock('@/features/access-management/accessManagement.service', () => ({
  accessManagementService: {
    searchRoleTypes: vi.fn(async () => ({ success: true, message: '', data: { count: 0, items: [] } })),
    searchRoles: vi.fn(async () => ({ success: true, message: '', data: { count: 0, items: [] } })),
  },
}))

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

// Locks in the product rule from features/inventory/real/*: assignment rows
// only ever appear/disappear via the FO request lifecycle, never a manual
// write — this must hold even for a manager-level identity, not just default off.
describe('InventoryAssignmentsPanel — read-only', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('renders the table with no create/delete controls and no clickable row, even for a manager-level identity', async () => {
    const { usePermission } = await import('@/hooks/usePermission')
    vi.mocked(usePermission).mockReturnValue({ hasAnyPermission: () => true } as unknown as ReturnType<typeof usePermission>)

    const InventoryAssignmentsPanel = (await import('@/features/inventory/real/components/InventoryAssignmentsPanel')).default

    render(
      <QueryClientProvider client={makeQueryClient()}>
        <InventoryAssignmentsPanel />
      </QueryClientProvider>,
    )

    await screen.findByText('SN-001')

    expect(screen.queryByRole('button', { name: /new assignment/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /remove assignment/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    const row = screen.getByText('SN-001').closest('tr')
    expect(row).not.toHaveClass('cursor-pointer')
  })
})
