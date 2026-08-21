import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import type { RoleEntity, RoleTypeEntity } from '@/types/accessManagement.types'

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

const searchRoleTypes = vi.fn<(query: unknown) => Promise<{ success: boolean; message: string; data: { items: RoleTypeEntity[]; count: number } }>>()
const searchRoles = vi.fn<(query: unknown) => Promise<{ success: boolean; message: string; data: { items: RoleEntity[]; count: number } }>>()

vi.mock('@/features/access-management/accessManagement.service', () => ({
  accessManagementService: {
    searchRoleTypes: (query: unknown) => searchRoleTypes(query),
    searchRoles: (query: unknown) => searchRoles(query),
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
    searchRoleTypes.mockResolvedValue({ success: true, message: '', data: { count: 0, items: [] } })
    searchRoles.mockResolvedValue({ success: true, message: '', data: { count: 0, items: [] } })
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

// A stock inventory-manager permission set holds neither tenant:manage nor tenant:admin.
describe('InventoryAssignmentsPanel — Field Officer filter permission gating', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    searchRoleTypes.mockResolvedValue({ success: true, message: '', data: { count: 0, items: [] } })
    searchRoles.mockResolvedValue({ success: true, message: '', data: { count: 0, items: [] } })
  })

  it('without tenant:manage/tenant:admin: the Field Officer filter does not render and never queries role-types/roles', async () => {
    const { usePermission } = await import('@/hooks/usePermission')
    vi.mocked(usePermission).mockReturnValue({
      hasAnyPermission: (perms: string[]) => perms.every((p) => p.startsWith('inventory-')),
    } as unknown as ReturnType<typeof usePermission>)

    const InventoryAssignmentsPanel = (await import('@/features/inventory/real/components/InventoryAssignmentsPanel')).default

    render(
      <QueryClientProvider client={makeQueryClient()}>
        <InventoryAssignmentsPanel />
      </QueryClientProvider>,
    )

    await screen.findByText('SN-001')

    expect(screen.queryByText('All field officers')).not.toBeInTheDocument()
    expect(searchRoleTypes).not.toHaveBeenCalled()
    expect(searchRoles).not.toHaveBeenCalled()
    // The rest of the tab stays fully usable.
    expect(screen.getByText('All types')).toBeInTheDocument()
  })

  it('with tenant:admin: the Field Officer filter renders and resolves the field-officer role type', async () => {
    searchRoleTypes.mockResolvedValue({
      success: true,
      message: '',
      data: {
        count: 1,
        items: [{
          id: 'rt-fo', code: 'field-officer', name: 'Field Officer', description: '', permissions: [],
          tenant: 'tenant-1', createdAt: '', updatedAt: '',
        }],
      },
    })
    searchRoles.mockResolvedValue({
      success: true,
      message: '',
      data: {
        count: 1,
        items: [{
          id: 'role-1', name: 'Jane FO', code: 'fo-1', permissions: [], status: 'active',
          type: 'rt-fo', user: 'user-1', tenant: 'tenant-1', createdAt: '', updatedAt: '',
        }],
      },
    })

    const { usePermission } = await import('@/hooks/usePermission')
    vi.mocked(usePermission).mockReturnValue({
      hasAnyPermission: (perms: string[]) => perms.includes('tenant:admin'),
    } as unknown as ReturnType<typeof usePermission>)

    const InventoryAssignmentsPanel = (await import('@/features/inventory/real/components/InventoryAssignmentsPanel')).default

    render(
      <QueryClientProvider client={makeQueryClient()}>
        <InventoryAssignmentsPanel />
      </QueryClientProvider>,
    )

    await screen.findByText('SN-001')
    expect(screen.getByText('All field officers')).toBeInTheDocument()

    await vi.waitFor(() => expect(searchRoleTypes).toHaveBeenCalledWith(expect.objectContaining({ code: 'field-officer' })))
    await vi.waitFor(() => expect(searchRoles).toHaveBeenCalledWith(expect.objectContaining({ type: 'rt-fo' })))
  })
})
