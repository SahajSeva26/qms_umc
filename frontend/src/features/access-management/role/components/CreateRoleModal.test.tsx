import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import type { RoleTypeEntity, PermissionGroupEntity, RoleEntity } from '@/types/accessManagement.types'
import type { DivisionEntity } from '@/types/crm.types'

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

// Company is a TenantSearchList (inline, always-expanded search results —
// same pattern as the New Project wizard's "Search won leads"), not a
// Select or a popup picker — its results render as plain buttons directly
// in the page flow, and the search box never disappears/swaps to a
// read-only chip after a selection. Re-selecting a DIFFERENT company just
// means clearing the box and typing the new query.
async function selectCompany(user: ReturnType<typeof userEvent.setup>, query: string, optionText: RegExp) {
  const input = await screen.findByPlaceholderText(/search by company name/i)
  await user.clear(input)
  await user.type(input, query)
  const option = await screen.findByRole('button', { name: optionText }, { timeout: 3000 })
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

async function renderAndOpenModal(user: ReturnType<typeof userEvent.setup>, queryClient: QueryClient) {
  const CreateRoleModal = (await import('@/features/access-management/role/components/CreateRoleModal')).default
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <CreateRoleModal />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  await user.click(screen.getByRole('button', { name: /new role/i }))
}

describe('CreateRoleModal', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('create cascade: tenant -> role type -> division -> supervisor, and blocks Next without a required supervisor', async () => {
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    const { divisionService } = await import('@/features/crm/divisions/division.service')

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
    await renderAndOpenModal(user, queryClient)

    // Before a tenant is picked, no division/supervisor fields exist.
    expect(screen.queryByText(/select division/i)).not.toBeInTheDocument()

    await selectCompany(user, 'Acme', /Acme/i)

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

    // Attempt Next with no supervisor chosen — step 1 must block, never
    // reaching step 2/3 or calling createRole.
    const nextButton = screen.getByRole('button', { name: 'Next' })
    await user.click(nextButton)

    expect(screen.queryByText(/step 2 of 3/i)).not.toBeInTheDocument()
    expect(await screen.findByText(/select a supervisor/i)).toBeInTheDocument()
    expect(accessManagementService.createRole).not.toHaveBeenCalled()
  })

  it('changing Company clears role type, division, and supervisor', async () => {
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    const { divisionService } = await import('@/features/crm/divisions/division.service')

    vi.mocked(accessManagementService.searchTenants).mockResolvedValue({
      success: true,
      message: '',
      data: { items: [{ id: 't-1', name: 'Acme', code: 'acme' }, { id: 't-2', name: 'Beta Co', code: 'beta' }], count: 2 },
    })
    vi.mocked(accessManagementService.searchRoleTypes).mockResolvedValue({
      success: true,
      message: '',
      data: {
        // RSM's supervisor parent (per PHARMA_SUPERVISOR_PARENT_CODE) is
        // Division Head — needed for useRoles's parentTypeId lookup to
        // resolve at all, or the supervisor candidates list stays empty.
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
    await renderAndOpenModal(user, queryClient)

    await selectCompany(user, 'Acme', /Acme/i)
    await waitFor(() => expect(screen.getByRole('combobox', { name: /role type/i })).toBeInTheDocument())
    await selectByLabel(user, /role type/i, /RSM/i)
    await waitFor(() => expect(screen.getByText(/select division/i)).toBeInTheDocument())
    await selectByVisibleText(user, /select division/i, /Cardiology Division/i)
    await waitFor(() => expect(screen.getByText(/select supervisor/i)).toBeInTheDocument())
    await selectByVisibleText(user, /select supervisor/i, /Existing Supervisor/i)

    // Division and supervisor pickers are now showing real selections, not
    // their placeholders.
    expect(screen.queryByText(/^select division$/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/^select supervisor$/i)).not.toBeInTheDocument()

    // Switch Company — role type, division, and supervisor must all reset,
    // not silently carry the old tenant's IDs into the new tenant's payload.
    await selectCompany(user, 'Beta', /Beta Co/i)

    await waitFor(() => expect(screen.getByText(/select a company first|select role type/i)).toBeInTheDocument())
    // needsDivision/needsSupervisor only re-derive to true once a
    // division-requiring role type is picked again — checking the division/
    // supervisor UI is merely ABSENT here would pass even if the bug were
    // present (stale form values hidden behind a cleared roleType look
    // identical to genuinely-cleared ones). Re-select RSM under the NEW
    // company instead: if division/supervisor weren't really cleared, their
    // pickers would still show the old selections ("Cardiology Division",
    // "Existing Supervisor") instead of their placeholders.
    await selectByLabel(user, /role type/i, /RSM/i)
    // If division/supervisor were never actually cleared (the bug), their
    // pickers show the STALE selections directly (not even a placeholder) —
    // assert the real fixed behavior: back to placeholders, old values gone.
    await waitFor(() => expect(screen.queryByText(/Cardiology Division/i)).not.toBeInTheDocument())
    expect(screen.getByText(/^select division$/i)).toBeInTheDocument()
    expect(screen.queryByText(/Existing Supervisor/i)).not.toBeInTheDocument()
  })

  it('changing Role Type clears division and supervisor', async () => {
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    const { divisionService } = await import('@/features/crm/divisions/division.service')

    vi.mocked(accessManagementService.searchTenants).mockResolvedValue({
      success: true, message: '', data: { items: [{ id: 't-1', name: 'Acme', code: 'acme' }], count: 1 },
    })
    vi.mocked(accessManagementService.searchRoleTypes).mockResolvedValue({
      success: true,
      message: '',
      data: {
        // RSM's supervisor parent is Division Head; ASM's is RSM itself —
        // both parent role types must be present or useRoles's parentTypeId
        // lookup never resolves and the supervisor candidates list stays
        // permanently empty for either selection.
        items: [
          roleTypeFixture({ id: 'rt-dh', code: 'pharma-division-head', name: 'Division Head' }),
          roleTypeFixture({ id: 'rt-rsm', code: 'pharma-rsm', name: 'RSM' }),
          roleTypeFixture({ id: 'rt-asm', code: 'pharma-asm', name: 'ASM' }),
        ],
        count: 3,
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
    await renderAndOpenModal(user, queryClient)

    await selectCompany(user, 'Acme', /Acme/i)
    await selectByLabel(user, /role type/i, /RSM/i)
    await waitFor(() => expect(screen.getByText(/select division/i)).toBeInTheDocument())
    await selectByVisibleText(user, /select division/i, /Cardiology Division/i)
    await waitFor(() => expect(screen.getByText(/select supervisor/i)).toBeInTheDocument())
    await selectByVisibleText(user, /select supervisor/i, /Existing Supervisor/i)

    expect(screen.queryByText(/^select division$/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/^select supervisor$/i)).not.toBeInTheDocument()

    // Switch Role Type (still under the SAME company) — division and
    // supervisor must reset, since ASM needs its OWN division + supervisor
    // (an RSM, not the Division Head RSM itself reported to) — the previous
    // selections are for the wrong parent chain entirely and must not carry
    // over silently. ASM still needs a supervisor (its own RSM), so the
    // picker reappears — the important thing is it's back to a placeholder,
    // not still showing "Existing Supervisor" from before the switch.
    await selectByLabel(user, /role type/i, /ASM/i)

    await waitFor(() => expect(screen.getByText(/^select division$/i)).toBeInTheDocument())
    expect(screen.queryByText(/Existing Supervisor/i)).not.toBeInTheDocument()
  })

  it('permission ceiling on step 3: forbidden codes never render, only ceiling-and-role-type-intersected codes do', async () => {
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')

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
    await renderAndOpenModal(user, queryClient)

    await selectCompany(user, 'Acme', /Acme/i)
    await user.type(screen.getByLabelText(/^code$/i), 'sales-rep-jane')
    await user.type(screen.getByLabelText(/^name$/i), 'Sales Rep Jane')
    await selectByLabel(user, /role type/i, /Sales Rep/i)

    // Sales Rep needs neither division nor supervisor — Next should move
    // straight to step 2.
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await waitFor(() => expect(screen.getByText(/step 2 of 3/i)).toBeInTheDocument())

    await user.type(screen.getByLabelText(/first name/i), 'Jane')
    await user.type(screen.getByLabelText(/^email$/i), 'jane@example.com')
    await user.type(screen.getByLabelText(/^password$/i), 'password123')
    // Phone is required for the New Role flow — frontend-only policy (the
    // backend's own RegisterUserPayloadSchema still treats it as optional).
    await user.type(screen.getByLabelText(/phone/i), '9876543210')

    await user.click(screen.getByRole('button', { name: 'Next' }))
    await waitFor(() => expect(screen.getByText(/step 3 of 3/i)).toBeInTheDocument())

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

  it('phone is required on step 2 — frontend-only policy, blocks Next until filled', async () => {
    // No backend contract to verify against here: this is a deliberate
    // frontend-only requirement layered on top of RegisterUserPayloadSchema,
    // which still treats phone as genuinely optional server-side.
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')

    vi.mocked(accessManagementService.searchTenants).mockResolvedValue({
      success: true, message: '', data: { items: [{ id: 't-1', name: 'Acme', code: 'acme' }], count: 1 },
    })
    vi.mocked(accessManagementService.searchRoleTypes).mockResolvedValue({
      success: true,
      message: '',
      data: { items: [roleTypeFixture({ id: 'rt-1', code: 'sales-rep', name: 'Sales Rep' })], count: 1 },
    })
    vi.mocked(accessManagementService.searchPermissionGroups).mockResolvedValue({
      success: true, message: '', data: { items: [permissionGroupFixture()], count: 1 },
    })

    const queryClient = makeQueryClient()
    const user = userEvent.setup()
    await renderAndOpenModal(user, queryClient)

    await selectCompany(user, 'Acme', /Acme/i)
    await user.type(screen.getByLabelText(/^code$/i), 'sales-rep-phone-test')
    await user.type(screen.getByLabelText(/^name$/i), 'Sales Rep Phone Test')
    await selectByLabel(user, /role type/i, /Sales Rep/i)
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await waitFor(() => expect(screen.getByText(/step 2 of 3/i)).toBeInTheDocument())

    // Fill everything EXCEPT phone, attempt Next — must be blocked with a
    // visible error, never reaching step 3. Blank phone fails the same
    // min(10) check as a too-short one, so it surfaces the same message.
    await user.type(screen.getByLabelText(/first name/i), 'Jane')
    await user.type(screen.getByLabelText(/^email$/i), 'jane.nophone@example.com')
    await user.type(screen.getByLabelText(/^password$/i), 'password123')
    await user.click(screen.getByRole('button', { name: 'Next' }))

    expect(screen.queryByText(/step 3 of 3/i)).not.toBeInTheDocument()
    expect(await screen.findByText(/phone number must be at least 10 characters/i)).toBeInTheDocument()

    // A too-short (but non-blank) phone — matching the backend's own
    // min(10) bound (auth.validators.ts) — must also block Next.
    await user.type(screen.getByLabelText(/phone/i), '12345')
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.queryByText(/step 3 of 3/i)).not.toBeInTheDocument()
    expect(await screen.findByText(/phone number must be at least 10 characters/i)).toBeInTheDocument()

    // Filling phone with a 10+ character value and retrying Next must succeed.
    await user.type(screen.getByLabelText(/phone/i), '67890')
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await waitFor(() => expect(screen.getByText(/step 3 of 3/i)).toBeInTheDocument())
  })
})
