import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from '@/components/ui/sonner'

vi.mock('@/hooks/useSession')

vi.mock('@/components/ui/sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

vi.mock('@/features/access-management/accessManagement.service', () => ({
  accessManagementService: {
    searchRoleTypes: vi.fn(),
    searchRoles: vi.fn(async () => ({ success: true, message: '', data: { items: [{ id: 'asm-1', code: 'phr-000001', name: 'Test ASM' }], count: 1 } })),
    createRole: vi.fn(),
  },
}))

vi.mock('@/features/crm/divisions/division.service', () => ({
  divisionService: {
    bulkCreateMr: vi.fn(),
  },
}))

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

async function mockPermissions(codes: string[]) {
  const { useSession } = await import('@/hooks/useSession')
  vi.mocked(useSession).mockReturnValue({
    session: { role: { id: 'r-1', code: 'admin', name: 'Admin' }, roleType: { id: 'rt-1', code: 'admin', name: 'admin' }, tenant: { id: 't-1', code: 'qms', name: 'QMS', type: 'platform' }, permissions: codes },
    isLoading: false, isFetching: false, isSettled: true, isError: false, error: null,
    isAuthenticated: true, isConfirmedUnauthenticated: false,
    hasPermission: (c: string) => codes.includes(c),
    hasAnyPermission: (cs: string[]) => cs.some((c) => codes.includes(c)),
    hasAllPermissions: (cs: string[]) => cs.every((c) => codes.includes(c)),
    refetchSession: vi.fn(), clearSession: vi.fn(),
  } as unknown as ReturnType<typeof useSession>)
}

async function mockRoleTypesSuccess() {
  const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
  vi.mocked(accessManagementService.searchRoleTypes).mockImplementation(async (query: { code?: string }) => {
    if (query.code === 'pharma-asm') return { success: true, message: '', data: { items: [{ id: 'rt-asm', code: 'pharma-asm' }], count: 1 } } as never
    if (query.code === 'pharma-mr') return { success: true, message: '', data: { items: [{ id: 'rt-mr', code: 'pharma-mr' }], count: 1 } } as never
    return { success: true, message: '', data: { items: [], count: 0 } } as never
  })
}

async function renderCard() {
  const MrProvisioningCard = (await import('./MrProvisioningCard')).default
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <MrProvisioningCard tenantId="t-1" divisionId="div-1" />
    </QueryClientProvider>,
  )
}

async function pickAsm(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByLabelText(/supervisor \(asm\)/i))
  const option = await screen.findByRole('option', { name: /test asm/i })
  await user.click(option)
}

function makeCsvFile() {
  return new File(['firstName,lastName,email,phone,password\nAlice,Smith,alice@example.com,9999999999,password1'], 'mrs.csv', { type: 'text/csv' })
}

describe('MrProvisioningCard — permissions', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('tenant:admin sees both Single and CSV tabs', async () => {
    await mockPermissions(['tenant:admin'])
    await mockRoleTypesSuccess()
    await renderCard()

    expect(await screen.findByRole('button', { name: /^single$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^csv$/i })).toBeInTheDocument()
  })

  it('tenant:manage-only sees Single directly, with no tab toggle at all', async () => {
    await mockPermissions(['tenant:manage'])
    await mockRoleTypesSuccess()
    await renderCard()

    await screen.findByText(/first name \*/i)
    expect(screen.queryByRole('button', { name: /^single$/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^csv$/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/csv file/i)).not.toBeInTheDocument()
  })

  it('division:manage-only sees nothing — cannot populate the required ASM picker', async () => {
    await mockPermissions(['division:manage'])
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')

    const { container } = await renderCard()

    expect(container).toBeEmptyDOMElement()
    expect(accessManagementService.searchRoleTypes).not.toHaveBeenCalled()
    expect(accessManagementService.searchRoles).not.toHaveBeenCalled()
  })

  it('no applicable permission renders nothing and fires no role/role-type queries', async () => {
    await mockPermissions([])
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')

    const { container } = await renderCard()

    expect(container).toBeEmptyDOMElement()
    expect(accessManagementService.searchRoleTypes).not.toHaveBeenCalled()
    expect(accessManagementService.searchRoles).not.toHaveBeenCalled()
  })
})

describe('MrProvisioningCard — single add', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('derives the role name from firstName only, matching the bulk-import convention', async () => {
    await mockPermissions(['tenant:admin'])
    await mockRoleTypesSuccess()
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    vi.mocked(accessManagementService.createRole).mockResolvedValue({ success: true, message: '', data: {} } as never)

    const user = userEvent.setup()
    await renderCard()
    await user.click(await screen.findByRole('button', { name: /^single$/i }))

    await pickAsm(user)
    await user.type(screen.getByLabelText(/first name \*/i), 'Alice')
    await user.type(screen.getByLabelText(/^last name$/i), 'Smith')
    await user.type(screen.getByLabelText(/email \*/i), 'alice@example.com')
    await user.type(screen.getByLabelText(/password \*/i), 'password1')

    await user.click(screen.getByRole('button', { name: /^add mr$/i }))

    await waitFor(() => expect(accessManagementService.createRole).toHaveBeenCalledTimes(1))
    const payload = vi.mocked(accessManagementService.createRole).mock.calls[0][0]
    expect(payload.name).toBe('pharma-mr role for Alice')
  })

  it('omits code from the payload entirely — the backend auto-generates it', async () => {
    await mockPermissions(['tenant:admin'])
    await mockRoleTypesSuccess()
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    vi.mocked(accessManagementService.createRole).mockResolvedValue({ success: true, message: '', data: {} } as never)

    const user = userEvent.setup()
    await renderCard()
    await user.click(await screen.findByRole('button', { name: /^single$/i }))

    await pickAsm(user)
    await user.type(screen.getByLabelText(/first name \*/i), 'Alice')
    await user.type(screen.getByLabelText(/email \*/i), 'alice@example.com')
    await user.type(screen.getByLabelText(/password \*/i), 'password1')
    await user.click(screen.getByRole('button', { name: /^add mr$/i }))

    await waitFor(() => expect(accessManagementService.createRole).toHaveBeenCalledTimes(1))
    const payload = vi.mocked(accessManagementService.createRole).mock.calls[0][0]
    expect(payload.code).toBeUndefined()
    expect(payload.type).toBe('rt-mr')
    expect(payload.permissions).toEqual([])
  })

  it('accepts a blank phone, and rejects a too-short phone with the real "characters" wording', async () => {
    await mockPermissions(['tenant:admin'])
    await mockRoleTypesSuccess()
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')

    const user = userEvent.setup()
    await renderCard()
    await user.click(await screen.findByRole('button', { name: /^single$/i }))

    await pickAsm(user)
    await user.type(screen.getByLabelText(/first name \*/i), 'Alice')
    await user.type(screen.getByLabelText(/email \*/i), 'alice@example.com')
    await user.type(screen.getByLabelText(/password \*/i), 'password1')
    await user.type(screen.getByLabelText(/^phone$/i), '123')
    await user.click(screen.getByRole('button', { name: /^add mr$/i }))

    expect(await screen.findByText(/at least 10 characters/i)).toBeInTheDocument()
    expect(accessManagementService.createRole).not.toHaveBeenCalled()
  })

  it('blocks submit with no ASM selected', async () => {
    await mockPermissions(['tenant:admin'])
    await mockRoleTypesSuccess()
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')

    const user = userEvent.setup()
    await renderCard()
    await user.click(await screen.findByRole('button', { name: /^single$/i }))

    await user.type(screen.getByLabelText(/first name \*/i), 'Alice')
    await user.type(screen.getByLabelText(/email \*/i), 'alice@example.com')
    await user.type(screen.getByLabelText(/password \*/i), 'password1')
    await user.click(screen.getByRole('button', { name: /^add mr$/i }))

    expect(await screen.findByText(/select an asm/i)).toBeInTheDocument()
    expect(accessManagementService.createRole).not.toHaveBeenCalled()
  })

  it('keeps the selected ASM after a successful add, resetting only the person fields', async () => {
    await mockPermissions(['tenant:admin'])
    await mockRoleTypesSuccess()
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    vi.mocked(accessManagementService.createRole).mockResolvedValue({ success: true, message: '', data: {} } as never)

    const user = userEvent.setup()
    await renderCard()
    await user.click(await screen.findByRole('button', { name: /^single$/i }))

    await pickAsm(user)
    await user.type(screen.getByLabelText(/first name \*/i), 'Alice')
    await user.type(screen.getByLabelText(/email \*/i), 'alice@example.com')
    await user.type(screen.getByLabelText(/password \*/i), 'password1')
    await user.click(screen.getByRole('button', { name: /^add mr$/i }))

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('MR added'))
    // Person fields cleared...
    expect(screen.getByLabelText(/first name \*/i)).toHaveValue('')
    // ...but the ASM chip is still showing the same selection.
    expect(screen.getByText(/test asm/i)).toBeInTheDocument()

    // A second MR can be added immediately, still reporting to the same ASM.
    await user.type(screen.getByLabelText(/first name \*/i), 'Bob')
    await user.type(screen.getByLabelText(/email \*/i), 'bob@example.com')
    await user.type(screen.getByLabelText(/password \*/i), 'password1')
    await user.click(screen.getByRole('button', { name: /^add mr$/i }))

    await waitFor(() => expect(accessManagementService.createRole).toHaveBeenCalledTimes(2))
    expect(vi.mocked(accessManagementService.createRole).mock.calls[1][0].supervisor).toBe('asm-1')
  })
})

describe('MrProvisioningCard — role-type lookup states', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('shows a missing-configuration message only when both lookups succeed with no matching role type', async () => {
    await mockPermissions(['tenant:admin'])
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    vi.mocked(accessManagementService.searchRoleTypes).mockResolvedValue({ success: true, message: '', data: { items: [], count: 0 } } as never)

    await renderCard()

    expect(await screen.findByText(/missing a required role type/i)).toBeInTheDocument()
    expect(screen.queryByText(/couldn't load role configuration/i)).not.toBeInTheDocument()
  })

  it('shows a retry-able load-error state, not the missing-configuration message, when a lookup fails', async () => {
    await mockPermissions(['tenant:admin'])
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    vi.mocked(accessManagementService.searchRoleTypes).mockRejectedValue(new Error('network error'))

    await renderCard()

    expect(await screen.findByText(/couldn't load role configuration/i)).toBeInTheDocument()
    expect(screen.queryByText(/missing a required role type/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })
})

describe('MrProvisioningCard — CSV import', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('disables Import and blocks submission while role-type configuration is missing', async () => {
    await mockPermissions(['tenant:admin'])
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    vi.mocked(accessManagementService.searchRoleTypes).mockResolvedValue({ success: true, message: '', data: { items: [], count: 0 } } as never)
    const { divisionService } = await import('@/features/crm/divisions/division.service')

    const user = userEvent.setup()
    await renderCard()

    expect(await screen.findByText(/missing a required role type/i)).toBeInTheDocument()
    const importButton = screen.getByRole('button', { name: /import mrs/i })
    expect(importButton).toBeDisabled()

    // Even if somehow clicked, handleImport must bail out before mutating.
    await user.click(importButton)
    expect(divisionService.bulkCreateMr).not.toHaveBeenCalled()
  })

  it('disables Import and blocks submission when role-type lookup has failed', async () => {
    await mockPermissions(['tenant:admin'])
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    vi.mocked(accessManagementService.searchRoleTypes).mockRejectedValue(new Error('network error'))
    const { divisionService } = await import('@/features/crm/divisions/division.service')

    const user = userEvent.setup()
    await renderCard()

    expect(await screen.findByText(/couldn't load role configuration/i)).toBeInTheDocument()
    const importButton = screen.getByRole('button', { name: /import mrs/i })
    expect(importButton).toBeDisabled()

    await user.click(importButton)
    expect(divisionService.bulkCreateMr).not.toHaveBeenCalled()
  })

  it('successfully imports a CSV file once an ASM and file are chosen', async () => {
    await mockPermissions(['tenant:admin'])
    await mockRoleTypesSuccess()
    const { divisionService } = await import('@/features/crm/divisions/division.service')
    vi.mocked(divisionService.bulkCreateMr).mockResolvedValue({ totalRows: 1, created: 1, failed: 0, errors: [] })

    const user = userEvent.setup()
    await renderCard()
    // CSV is the default tab when both are available — no tab switch needed.
    await pickAsm(user)

    const file = makeCsvFile()
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(fileInput, file)

    await user.click(screen.getByRole('button', { name: /import mrs/i }))

    await waitFor(() => expect(divisionService.bulkCreateMr).toHaveBeenCalledTimes(1))
    const payload = vi.mocked(divisionService.bulkCreateMr).mock.calls[0][0]
    expect(payload).toMatchObject({ tenant: 't-1', division: 'div-1', supervisor: 'asm-1', file })
    expect(await screen.findByText(/1 of 1 rows imported successfully/i)).toBeInTheDocument()
  })
})

describe('MrProvisioningCard — ASM candidate list', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('shows a retry-able error, and never "No active ASM", when the ASM-roles search fails', async () => {
    await mockPermissions(['tenant:admin'])
    await mockRoleTypesSuccess()
    const { accessManagementService } = await import('@/features/access-management/accessManagement.service')
    vi.mocked(accessManagementService.searchRoles).mockRejectedValue(new Error('network error'))

    await renderCard()

    expect(await screen.findByText(/couldn't load asms for this division/i)).toBeInTheDocument()
    expect(screen.queryByText(/no active asm found/i)).not.toBeInTheDocument()
  })
})

describe('MrProvisioningCard — accessibility', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('associates every Single-add field and the ASM select with a real, programmatic label', async () => {
    await mockPermissions(['tenant:admin'])
    await mockRoleTypesSuccess()

    const user = userEvent.setup()
    await renderCard()
    await user.click(await screen.findByRole('button', { name: /^single$/i }))

    expect(screen.getByLabelText(/supervisor \(asm\)/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/first name \*/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^last name$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email \*/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password \*/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^phone$/i)).toBeInTheDocument()
  })
})
