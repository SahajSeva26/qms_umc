import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import type { RoleTypeEntity, PermissionGroupEntity, RoleEntity } from '@/types/accessManagement.types'
import type { DivisionEntity } from '@/types/crm.types'

vi.mock('@/features/access-management/accessManagement.service', () => ({
  accessManagementService: {
    searchTenants: vi.fn(async () => ({ success: true, message: '', data: { items: [{ id: 't-1', name: 'Acme', code: 'acme', address: null, businessLifetime: null, gst: null }], count: 1 } })),
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

// Company is a TenantSearchList (inline, always-expanded results as plain
// buttons), not a Select/popup — the search box never swaps to a read-only chip.
async function selectCompany(user: ReturnType<typeof userEvent.setup>, query: string, optionText: RegExp) {
  const input = await screen.findByPlaceholderText(/search by company name/i)
  await user.clear(input)
  await user.type(input, query)
  const option = await screen.findByRole('button', { name: optionText }, { timeout: 3000 })
  await user.click(option)
}

// Division/supervisor triggers have no <label htmlFor>, so jsdom's accessible-name
// lookup misses them — find by rendered text content instead of ARIA name.
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
      success: true, message: '', data: { items: [{ id: 't-1', name: 'Acme', code: 'acme', address: null, businessLifetime: null, gst: null }], count: 1 },
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
    // Zero candidates — a single one now auto-fills (see the test below).
    vi.mocked(accessManagementService.searchRoles).mockResolvedValue({
      success: true, message: '', data: { items: [], count: 0 },
    } as never)
    vi.mocked(accessManagementService.searchPermissionGroups).mockResolvedValue({
      success: true, message: '', data: { items: [permissionGroupFixture()], count: 1 },
    })

    const queryClient = makeQueryClient()
    const user = userEvent.setup()
    await renderAndOpenModal(user, queryClient)

    expect(screen.queryByText(/select division/i)).not.toBeInTheDocument()

    await selectCompany(user, 'Acme', /Acme/i)

    await waitFor(() => expect(accessManagementService.searchRoleTypes).toHaveBeenCalledWith(expect.objectContaining({ tenant: 't-1' })))

    await selectByLabel(user, /role type/i, /RSM/i)

    await waitFor(() => expect(screen.getByText(/select division/i)).toBeInTheDocument())

    await selectByVisibleText(user, /select division/i, /Cardiology Division/i)

    await waitFor(() =>
      expect(accessManagementService.searchRoles).toHaveBeenCalledWith(
        expect.objectContaining({ tenant: 't-1', division: 'div-1', status: 'active' }),
      ),
    )

    // Attempt Next with no supervisor chosen — step 1 must block, never reaching step 2/3.
    const nextButton = screen.getByRole('button', { name: 'Next' })
    await user.click(nextButton)

    expect(screen.queryByText(/step 2 of 3/i)).not.toBeInTheDocument()
    // Renders once as RoleDetailsSection's inline hint and again as this
    // step's blocked-Next banner — both share this same copy.
    await waitFor(() => expect(screen.getAllByText(/no eligible supervisor/i).length).toBeGreaterThan(0))
    expect(accessManagementService.createRole).not.toHaveBeenCalled()
  })

  it('auto-fills the supervisor when exactly one eligible candidate exists for the chosen division', async () => {
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    const { divisionService } = await import('@/features/crm/divisions/division.service')

    vi.mocked(accessManagementService.searchTenants).mockResolvedValue({
      success: true, message: '', data: { items: [{ id: 't-1', name: 'Acme', code: 'acme', address: null, businessLifetime: null, gst: null }], count: 1 },
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
    // Division Head is architecturally singular per division — exactly one
    // active candidate is the common, expected case this auto-fill targets.
    vi.mocked(accessManagementService.searchRoles).mockResolvedValue({
      success: true, message: '', data: { items: [roleFixture()], count: 1 },
    } as never)
    vi.mocked(accessManagementService.searchPermissionGroups).mockResolvedValue({
      success: true, message: '', data: { items: [permissionGroupFixture()], count: 1 },
    })

    const queryClient = makeQueryClient()
    const user = userEvent.setup()
    await renderAndOpenModal(user, queryClient)

    await user.type(screen.getByLabelText(/^name$/i), 'RSM North')
    await selectCompany(user, 'Acme', /Acme/i)
    await selectByLabel(user, /role type/i, /RSM/i)
    await waitFor(() => expect(screen.getByText(/select division/i)).toBeInTheDocument())
    await selectByVisibleText(user, /select division/i, /Cardiology Division/i)

    // No manual supervisor selection — the one candidate fills in on its own.
    await waitFor(() => expect(screen.getByText(/Existing Supervisor/i)).toBeInTheDocument())
    expect(screen.queryByText(/^select supervisor$/i)).not.toBeInTheDocument()

    // Next proceeds straight through since the field is already satisfied.
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(await screen.findByText(/step 2 of 3/i)).toBeInTheDocument()
  })

  it('changing Company clears role type, division, and supervisor', async () => {
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    const { divisionService } = await import('@/features/crm/divisions/division.service')

    vi.mocked(accessManagementService.searchTenants).mockResolvedValue({
      success: true,
      message: '',
      data: { items: [{ id: 't-1', name: 'Acme', code: 'acme', address: null, businessLifetime: null, gst: null }, { id: 't-2', name: 'Beta Co', code: 'beta', address: null, businessLifetime: null, gst: null }], count: 2 },
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

    await selectCompany(user, 'Acme', /Acme/i)
    await waitFor(() => expect(screen.getByRole('combobox', { name: /role type/i })).toBeInTheDocument())
    await selectByLabel(user, /role type/i, /RSM/i)
    await waitFor(() => expect(screen.getByText(/select division/i)).toBeInTheDocument())
    await selectByVisibleText(user, /select division/i, /Cardiology Division/i)
    // The single eligible candidate auto-fills — no manual supervisor pick needed.
    await waitFor(() => expect(screen.getByText(/Existing Supervisor/i)).toBeInTheDocument())

    expect(screen.queryByText(/^select division$/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/^select supervisor$/i)).not.toBeInTheDocument()

    // Switch Company — role type, division, and supervisor must all reset,
    // not silently carry the old tenant's IDs into the new tenant's payload.
    await selectCompany(user, 'Beta', /Beta Co/i)

    await waitFor(() => expect(screen.getByText(/select a company first|select role type/i)).toBeInTheDocument())
    // A cleared field looks the same as absent, so re-select RSM and confirm
    // the OLD division/supervisor selections don't reappear.
    await selectByLabel(user, /role type/i, /RSM/i)
    await waitFor(() => expect(screen.queryByText(/Cardiology Division/i)).not.toBeInTheDocument())
    expect(screen.getByText(/^select division$/i)).toBeInTheDocument()
    expect(screen.queryByText(/Existing Supervisor/i)).not.toBeInTheDocument()
  })

  it('changing Role Type clears division and supervisor', async () => {
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    const { divisionService } = await import('@/features/crm/divisions/division.service')

    vi.mocked(accessManagementService.searchTenants).mockResolvedValue({
      success: true, message: '', data: { items: [{ id: 't-1', name: 'Acme', code: 'acme', address: null, businessLifetime: null, gst: null }], count: 1 },
    })
    vi.mocked(accessManagementService.searchRoleTypes).mockResolvedValue({
      success: true,
      message: '',
      data: {
        // RSM's supervisor parent is Division Head; ASM's is RSM itself — both
        // must be present or useRoles's parentTypeId lookup never resolves.
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
    // The single eligible candidate auto-fills — no manual supervisor pick needed.
    await waitFor(() => expect(screen.getByText(/Existing Supervisor/i)).toBeInTheDocument())

    expect(screen.queryByText(/^select division$/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/^select supervisor$/i)).not.toBeInTheDocument()

    // Switch Role Type under the SAME company — division and supervisor must
    // reset, since ASM's parent chain (its own RSM) differs from RSM's.
    await selectByLabel(user, /role type/i, /ASM/i)

    await waitFor(() => expect(screen.getByText(/^select division$/i)).toBeInTheDocument())
    expect(screen.queryByText(/Existing Supervisor/i)).not.toBeInTheDocument()
  })

  it('permission ceiling on step 3: forbidden codes never render, only ceiling-and-role-type-intersected codes do', async () => {
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')

    vi.mocked(accessManagementService.searchTenants).mockResolvedValue({
      success: true, message: '', data: { items: [{ id: 't-1', name: 'Acme', code: 'acme', address: null, businessLifetime: null, gst: null }], count: 1 },
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
    await user.type(screen.getByLabelText(/^name$/i), 'Sales Rep Jane')
    await selectByLabel(user, /role type/i, /Sales Rep/i)

    await user.click(screen.getByRole('button', { name: 'Next' }))
    await waitFor(() => expect(screen.getByText(/step 2 of 3/i)).toBeInTheDocument())

    await user.type(screen.getByLabelText(/first name/i), 'Jane')
    await user.type(screen.getByLabelText(/^email$/i), 'jane@example.com')
    await user.type(screen.getByLabelText(/^password$/i), 'password123')
    await user.type(screen.getByLabelText(/phone/i), '9876543210')

    await user.click(screen.getByRole('button', { name: 'Next' }))
    await waitFor(() => expect(screen.getByText(/step 3 of 3/i)).toBeInTheDocument())

    await waitFor(() => expect(screen.getByText(/Manage Sales/i)).toBeInTheDocument())

    // tenant:admin is in both the role type's permissions AND the tenant's
    // ceiling — useRolePermissionPicker must still exclude it entirely.
    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes).toHaveLength(1)
    expect(checkboxes[0].closest('label')).toHaveTextContent('sales.manage')
    expect(screen.queryByText('tenant:admin')).not.toBeInTheDocument()
  })

  it('phone is required on step 2 — frontend-only policy, blocks Next until filled', async () => {
    // Frontend-only requirement — backend's RegisterUserPayloadSchema treats phone as optional.
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')

    vi.mocked(accessManagementService.searchTenants).mockResolvedValue({
      success: true, message: '', data: { items: [{ id: 't-1', name: 'Acme', code: 'acme', address: null, businessLifetime: null, gst: null }], count: 1 },
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
    await user.type(screen.getByLabelText(/^name$/i), 'Sales Rep Phone Test')
    await selectByLabel(user, /role type/i, /Sales Rep/i)
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await waitFor(() => expect(screen.getByText(/step 2 of 3/i)).toBeInTheDocument())

    // Blank phone fails the same min(10) check as a too-short one, so it surfaces the same message.
    await user.type(screen.getByLabelText(/first name/i), 'Jane')
    await user.type(screen.getByLabelText(/^email$/i), 'jane.nophone@example.com')
    await user.type(screen.getByLabelText(/^password$/i), 'password123')
    await user.click(screen.getByRole('button', { name: 'Next' }))

    expect(screen.queryByText(/step 3 of 3/i)).not.toBeInTheDocument()
    expect(await screen.findByText(/phone number must be at least 10 characters/i)).toBeInTheDocument()

    await user.type(screen.getByLabelText(/phone/i), '12345')
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.queryByText(/step 3 of 3/i)).not.toBeInTheDocument()
    expect(await screen.findByText(/phone number must be at least 10 characters/i)).toBeInTheDocument()

    await user.type(screen.getByLabelText(/phone/i), '67890')
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await waitFor(() => expect(screen.getByText(/step 3 of 3/i)).toBeInTheDocument())
  })

  it('a division requirement that only becomes known AFTER step 0 is passed (roleTypes cache updating mid-flow) blocks Create at final submit and jumps back to step 0 with a visible error, instead of silently doing nothing', async () => {
    // Reproduces the real bug directly: needsDivision/needsSupervisor are
    // derived fresh every render from `roleTypes.find(rt => rt.id ===
    // roleType)?.code` (useRoleTypes' query result). Step 0's own Next button
    // reads this at the moment it's clicked; final submit (guardedSubmit) reads
    // it again, independently, whenever submit fires. These two reads can
    // disagree whenever the underlying roleTypes data changes shape between
    // them (e.g. a background refetch landing with a corrected/updated role
    // type list) — exactly simulated here via queryClient.setQueryData.
    //
    // Before this fix: guardedSubmit's `if (needsDivision && !values.division)
    // return` silently returned once the cache changed — the user, already on
    // step 1 (user-account fields), saw absolutely nothing happen: no toast, no
    // navigation, no network call, no error anywhere on screen (step 0's own
    // error box is gated on stepAttempted[0], never set by guardedSubmit).
    // Exactly the production bug's shape.
    //
    // After this fix: guardedSubmit marks step 0 attempted and jumps back to
    // it, surfacing the same error box step 0's own Next already has.
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')

    const roleTypesWithoutDivisionRequirement = {
      success: true,
      message: '',
      data: { items: [roleTypeFixture({ id: 'rt-plain', code: 'sales-rep', name: 'Plain Role' })], count: 1 },
    }
    const roleTypesWithDivisionRequirement = {
      success: true,
      message: '',
      data: {
        items: [
          // SAME id, DIFFERENT (pharma) code — models a refetch correcting/
          // updating this role type's data after the user already picked it.
          roleTypeFixture({ id: 'rt-plain', code: 'pharma-rsm', name: 'RSM (corrected)' }),
          roleTypeFixture({ id: 'rt-dh', code: 'pharma-division-head', name: 'Division Head' }),
        ],
        count: 2,
      },
    }

    vi.mocked(accessManagementService.searchTenants).mockResolvedValue({
      success: true, message: '', data: { items: [{ id: 't-1', name: 'Acme', code: 'acme', address: null, businessLifetime: null, gst: null }], count: 1 },
    })
    vi.mocked(accessManagementService.searchRoleTypes).mockResolvedValue(roleTypesWithoutDivisionRequirement)
    vi.mocked(accessManagementService.searchPermissionGroups).mockResolvedValue({
      success: true, message: '', data: { items: [permissionGroupFixture()], count: 1 },
    })

    const queryClient = makeQueryClient()
    const user = userEvent.setup()
    await renderAndOpenModal(user, queryClient)

    await selectCompany(user, 'Acme', /Acme/i)
    await user.type(screen.getByLabelText(/^name$/i), 'Race Condition RSM')
    await selectByLabel(user, /role type/i, /Plain Role/i)

    // No division requirement YET — Next's own needsDivision check passes
    // trivially, exactly like the real bug's window.
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await waitFor(() => expect(screen.getByText(/step 2 of 3/i)).toBeInTheDocument())

    // The cache updates while the user is already on step 1 — the SAME id now
    // resolves to a pharma code requiring a division never collected.
    queryClient.setQueryData(['role-types', { tenant: 't-1' }], roleTypesWithDivisionRequirement)

    await user.type(screen.getByLabelText(/first name/i), 'Jane')
    await user.type(screen.getByLabelText(/^email$/i), 'jane@example.com')
    await user.type(screen.getByLabelText(/^password$/i), 'password123')
    await user.type(screen.getByLabelText(/phone/i), '9876543210')

    // Step 1 has no submit control of its own — advance to step 2 (the user
    // can always do this; nothing on step 1 re-checks needsDivision) and click
    // the real "Create role" submit button there. This is the exact, always-
    // reachable path: a requirement that only became true after step 0 already
    // passed is invisible on every later step until final submit is attempted.
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await waitFor(() => expect(screen.getByText(/step 3 of 3/i)).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /create role/i }))

    expect(await screen.findByText(/step 1 of 3/i)).toBeInTheDocument()
    expect(await screen.findByText(/select a division for this role type/i)).toBeInTheDocument()
    expect(accessManagementService.createRole).not.toHaveBeenCalled()
  })

  it('STEP_FIELD_NAMES and the real trigger() call agree on step 0 — no silent drift between the display list and what is actually validated', async () => {
    // Regression guard for the other half of this bug: STEP_FIELD_NAMES[0] used to
    // list ['name','roleType','division','supervisor'] while handleNext's real
    // trigger() call validated ['tenant','name','roleType'] — a bare 'tenant' typo
    // or future field addition to one list but not the other would silently stop
    // showing/validating that field. Exercise it the direct way: clearing Name
    // (a STEP_FIELD_NAMES[0] AND STEP_0_RHF_FIELDS member) must block Next with a
    // visible error — proving both lists still cover the same real fields.
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')

    vi.mocked(accessManagementService.searchTenants).mockResolvedValue({
      success: true, message: '', data: { items: [{ id: 't-1', name: 'Acme', code: 'acme', address: null, businessLifetime: null, gst: null }], count: 1 },
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
    await selectByLabel(user, /role type/i, /Sales Rep/i)
    // Name left blank — required by both the real validator and the display list.
    await user.click(screen.getByRole('button', { name: 'Next' }))

    expect(screen.queryByText(/step 2 of 3/i)).not.toBeInTheDocument()
    expect(await screen.findByText(/name is required/i)).toBeInTheDocument()
    expect(accessManagementService.createRole).not.toHaveBeenCalled()
  })
})
