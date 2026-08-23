import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import type { RoleTypeEntity, PermissionGroupEntity, RoleEntity } from '@/features/access-management/accessManagement.types'
import type { DivisionEntity } from '@/features/crm/crm.types'

vi.mock('@/features/access-management/accessManagement.service', () => ({
  accessManagementService: {
    searchTenants: vi.fn(async () => ({ success: true, message: '', data: { items: [{ id: 't-1', name: 'Acme', code: 'acme' }], count: 1 } })),
    searchRoleTypes: vi.fn(async () => ({ success: true, message: '', data: { items: [], count: 0 } })),
    searchRoles: vi.fn(async () => ({ success: true, message: '', data: { items: [], count: 0 } })),
    searchPermissionGroups: vi.fn(async () => ({ success: true, message: '', data: { items: [], count: 0 } })),
    createRole: vi.fn(async () => ({ success: true, message: '', data: { id: 'new-role-id' } })),
  },
}))

vi.mock('@/features/crm/divisions/division.service', () => ({
  divisionService: {
    searchDivisions: vi.fn(async () => ({ success: true, message: '', data: { items: [], count: 0 } })),
  },
}))

function roleTypeFixture(overrides: Partial<RoleTypeEntity> = {}): RoleTypeEntity {
  return {
    id: 'rt-1',
    code: 'sales-rep',
    name: 'Sales Rep',
    description: '',
    permissions: [],
    tenant: 't-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  } as RoleTypeEntity
}

function permissionGroupFixture(overrides: Partial<PermissionGroupEntity> = {}): PermissionGroupEntity {
  return {
    id: 'pg-1',
    code: 'default',
    name: 'Default',
    description: '',
    tenant: 't-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    permissions: [],
    ...overrides,
  } as PermissionGroupEntity
}

function divisionFixture(overrides: Partial<DivisionEntity> = {}): Partial<DivisionEntity> {
  return { id: 'div-1', name: 'Cardiology Division', ...overrides }
}

function roleFixture(overrides: Partial<RoleEntity> = {}): Partial<RoleEntity> {
  return { id: 'r-1', name: 'Existing Supervisor', code: 'sup-1', ...overrides }
}

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

async function selectByLabel(user: ReturnType<typeof userEvent.setup>, labelName: RegExp, optionName: RegExp) {
  const trigger = await screen.findByRole('combobox', { name: labelName })
  await user.click(trigger)
  const listbox = await screen.findByRole('listbox')
  const option = await within(listbox).findByRole('option', { name: optionName })
  await user.click(option)
}

// Division/supervisor triggers have no <label htmlFor> association (unlike
// tenant/roleType), so jsdom's accessible-name computation doesn't reliably
// pick up their visible placeholder text — find the trigger by its rendered
// text content instead of by ARIA name.
async function selectByVisibleText(user: ReturnType<typeof userEvent.setup>, triggerText: RegExp, optionName: RegExp) {
  const trigger = await waitFor(() => {
    const el = screen.getByText(triggerText).closest('[role="combobox"]')
    if (!el) throw new Error(`No combobox trigger found containing text matching ${triggerText}`)
    return el
  })
  await user.click(trigger)
  const listbox = await screen.findByRole('listbox')
  const option = await within(listbox).findByRole('option', { name: optionName })
  await user.click(option)
}

describe('CreateRoleEditor', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('create cascade: tenant -> role type -> division -> supervisor, and blocks submit without a required supervisor', async () => {
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    const { divisionService } = await import('@/features/crm/divisions/division.service')
    const CreateRoleEditor = (await import('@/features/access-management/role/components/CreateRoleEditor')).default

    vi.mocked(accessManagementService.searchTenants).mockResolvedValue({
      success: true, message: '', data: { items: [{ id: 't-1', name: 'Acme', code: 'acme' }], count: 1 },
    })
    vi.mocked(accessManagementService.searchRoleTypes).mockResolvedValue({
      success: true,
      message: '',
      data: {
        items: [
          roleTypeFixture({ id: 'rt-rsm', code: 'pharma-rsm', name: 'RSM' }),
          roleTypeFixture({ id: 'rt-dh', code: 'pharma-division-head', name: 'Division Head' }),
        ],
        count: 2,
      },
    })
    vi.mocked(divisionService.searchDivisions).mockResolvedValue({
      success: true, message: '', data: { items: [divisionFixture()], count: 1 },
    } as never)
    vi.mocked(accessManagementService.searchRoles).mockResolvedValue({
      success: true, message: '', data: { items: [roleFixture()], count: 1 },
    } as never)
    vi.mocked(accessManagementService.searchPermissionGroups).mockResolvedValue({
      success: true, message: '', data: { items: [permissionGroupFixture()], count: 1 },
    })

    const queryClient = makeQueryClient()
    const user = userEvent.setup()

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CreateRoleEditor />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    // Before a tenant is picked, no division/supervisor fields exist.
    expect(screen.queryByText(/select division/i)).not.toBeInTheDocument()

    await selectByLabel(user, /company/i, /Acme/i)

    await waitFor(() => expect(accessManagementService.searchRoleTypes).toHaveBeenCalledWith(expect.objectContaining({ tenant: 't-1' })))

    await selectByLabel(user, /role type/i, /RSM/i)

    // Selecting a division-requiring role type reveals the division picker.
    await waitFor(() => expect(screen.getByText(/select division/i)).toBeInTheDocument())

    await selectByVisibleText(user, /select division/i, /Cardiology Division/i)

    await waitFor(() =>
      expect(accessManagementService.searchRoles).toHaveBeenCalledWith(
        expect.objectContaining({ tenant: 't-1', division: 'div-1', status: 'active' }),
      ),
    )

    // Attempt submit with no supervisor chosen — must be blocked.
    const submitButton = screen.getByRole('button', { name: /create role/i })
    await user.click(submitButton)

    expect(accessManagementService.createRole).not.toHaveBeenCalled()
  })

  it('permission ceiling: forbidden codes never render, only ceiling-and-role-type-intersected codes do', async () => {
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    const CreateRoleEditor = (await import('@/features/access-management/role/components/CreateRoleEditor')).default

    vi.mocked(accessManagementService.searchTenants).mockResolvedValue({
      success: true, message: '', data: { items: [{ id: 't-1', name: 'Acme', code: 'acme' }], count: 1 },
    })
    vi.mocked(accessManagementService.searchRoleTypes).mockResolvedValue({
      success: true,
      message: '',
      data: {
        items: [roleTypeFixture({ id: 'rt-1', code: 'sales-rep', name: 'Sales Rep', permissions: ['sales.manage', 'tenant:admin'] })],
        count: 1,
      },
    })
    vi.mocked(accessManagementService.searchPermissionGroups).mockResolvedValue({
      success: true,
      message: '',
      data: {
        items: [
          permissionGroupFixture({
            permissions: [
              { code: 'sales.manage', name: 'Manage Sales', description: '' },
              { code: 'tenant:admin', name: 'Admin Company', description: '' },
            ],
          }),
        ],
        count: 1,
      },
    })

    const queryClient = makeQueryClient()
    const user = userEvent.setup()

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CreateRoleEditor />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    await selectByLabel(user, /company/i, /Acme/i)
    await selectByLabel(user, /role type/i, /Sales Rep/i)

    await waitFor(() => expect(screen.getByText(/Manage Sales/i)).toBeInTheDocument())

    // The forbidden code (tenant:admin / "Admin Company") is present in BOTH the
    // role type's own permissions AND the tenant's ceiling — useRolePermissionPicker
    // must still exclude it from candidatePermissions entirely: exactly one
    // checkbox row renders (the allowed code), never a second for the forbidden one.
    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes).toHaveLength(1)
    expect(checkboxes[0].closest('label')).toHaveTextContent('sales.manage')
    expect(screen.queryByText('tenant:admin')).not.toBeInTheDocument()
  })
})
