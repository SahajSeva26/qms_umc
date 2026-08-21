import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import type { RoleEntity } from '@/types/accessManagement.types'

vi.mock('@/features/access-management/accessManagement.service', () => ({
  accessManagementService: {
    updateRole: vi.fn(async () => ({ success: true, message: '', data: { id: 'role-a' } })),
    searchRoleTypes: vi.fn(async () => ({ success: true, message: '', data: { items: [], count: 0 } })),
    searchPermissionGroups: vi.fn(async () => ({ success: true, message: '', data: { items: [], count: 0 } })),
  },
}))

function roleFixture(overrides: Partial<RoleEntity> = {}): RoleEntity {
  return {
    id: 'role-a',
    code: 'role-a-code',
    name: 'Original Name',
    description: 'Original description',
    permissions: ['sales.manage'],
    status: 'active',
    type: { _id: 'rt-1', name: 'Sales Rep', code: 'sales-rep' },
    user: { _id: 'u-1', firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com', phone: '9999999999', gender: 'female', status: 'active' },
    tenant: { _id: 't-1', name: 'Acme', code: 'acme' },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  } as RoleEntity
}

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

describe('EditRoleEditor', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('hydrates every field from the role prop, including nested user fields and permissions', async () => {
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    const EditRoleEditor = (await import('@/features/access-management/role/components/EditRoleEditor')).default

    vi.mocked(accessManagementService.searchRoleTypes).mockResolvedValue({
      success: true,
      message: '',
      data: { items: [{ id: 'rt-1', code: 'sales-rep', name: 'Sales Rep', permissions: ['sales.manage'], tenant: 't-1', description: '', createdAt: '', updatedAt: '' }], count: 1 },
    })
    vi.mocked(accessManagementService.searchPermissionGroups).mockResolvedValue({
      success: true,
      message: '',
      data: { items: [{ id: 'pg-1', code: 'default', name: 'Default', description: '', tenant: 't-1', createdAt: '', updatedAt: '', permissions: [{ code: 'sales.manage', name: 'Manage Sales', description: '' }] }], count: 1 },
    })

    const role = roleFixture()
    const queryClient = makeQueryClient()

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <EditRoleEditor role={role} />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(await screen.findByLabelText(/^name$/i)).toHaveValue('Original Name')
    expect(screen.getByLabelText(/description/i)).toHaveValue('Original description')
    expect(screen.getByLabelText(/first name/i)).toHaveValue('Jane')
    expect(screen.getByLabelText(/last name/i)).toHaveValue('Doe')
    expect(screen.getByLabelText(/phone/i)).toHaveValue('9999999999')
    expect(screen.getByText('jane@example.com')).toBeInTheDocument()

    await waitFor(() => expect(screen.getByRole('checkbox')).toBeChecked())
  })

  it('submits an update payload containing only fields updateRoleSchema allows — no code/tenant/division/supervisor', async () => {
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    const EditRoleEditor = (await import('@/features/access-management/role/components/EditRoleEditor')).default

    vi.mocked(accessManagementService.searchRoleTypes).mockResolvedValue({
      success: true, message: '', data: { items: [], count: 0 },
    })
    vi.mocked(accessManagementService.searchPermissionGroups).mockResolvedValue({
      success: true, message: '', data: { items: [], count: 0 },
    })

    const role = roleFixture()
    const queryClient = makeQueryClient()
    const user = userEvent.setup()

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <EditRoleEditor role={role} />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    const nameInput = await screen.findByLabelText(/^name$/i)
    await user.clear(nameInput)
    await user.type(nameInput, 'Renamed Role')

    const submitButton = screen.getByRole('button', { name: /save changes/i })
    await user.click(submitButton)

    await waitFor(() => expect(accessManagementService.updateRole).toHaveBeenCalledTimes(1))

    const [id, payload] = vi.mocked(accessManagementService.updateRole).mock.calls[0]
    expect(id).toBe('role-a')
    expect(payload).not.toHaveProperty('code')
    expect(payload).not.toHaveProperty('tenant')
    expect(payload).not.toHaveProperty('division')
    expect(payload).not.toHaveProperty('supervisor')
    expect(payload.name).toBe('Renamed Role')
    expect(payload.user).not.toHaveProperty('email')
    expect(payload.user).not.toHaveProperty('password')
  })
})
