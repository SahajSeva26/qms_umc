import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import DivisionMrsSection from './DivisionMrsSection'
import { usePermission } from '@/hooks/usePermission'
import { useRoles } from '@/features/access-management/role/hooks/useRoles'
import { useRoleTypes } from '@/features/access-management/role-type/hooks/useRoleTypes'

vi.mock('@/hooks/usePermission')
vi.mock('@/features/access-management/role/hooks/useRoles')
vi.mock('@/features/access-management/role-type/hooks/useRoleTypes')
// MrProvisioningCard's own internals are covered by its own test file —
// stub it here so this file only exercises this component's own logic.
vi.mock('@/features/crm/divisions/components/MrProvisioningCard', () => ({
  default: ({ onSingleCreated }: { onSingleCreated?: () => void }) => (
    <div>
      <p>MrProvisioningCard stub</p>
      <button type="button" onClick={() => onSingleCreated?.()}>Simulate single MR created</button>
      {/* Deliberately calls nothing — the real CSV path never calls onSingleCreated. */}
      <button type="button">Simulate CSV import completed (does not close)</button>
    </div>
  ),
}))

function mockPermission(canView: boolean) {
  vi.mocked(usePermission).mockReturnValue({
    hasAnyPermission: (codes: string[]) => canView && (codes.includes('tenant:admin') || codes.includes('tenant:manage')),
  } as unknown as ReturnType<typeof usePermission>)
}

// Pass `null` (not omitted) to simulate a tenant with no pharma-mr role type
// configured — omitting it would fall back to the default instead.
function mockRoleType(id: string | null = 'rt-mr') {
  vi.mocked(useRoleTypes).mockReturnValue({
    data: { success: true, message: '', data: { items: id ? [{ id, code: 'pharma-mr' }] : [], count: id ? 1 : 0 } },
    isLoading: false,
  } as unknown as ReturnType<typeof useRoleTypes>)
}

function mrFixture(overrides: Partial<{ id: string; firstName: string; email: string; phone: string; status: 'active' | 'inactive' }> = {}) {
  return {
    id: overrides.id ?? 'role-1',
    code: 'phr-mr-001',
    name: 'pharma-mr role for Ravi',
    permissions: [],
    status: overrides.status ?? 'active',
    type: { id: 'rt-mr', code: 'pharma-mr', name: 'pharma-mr' },
    user: { firstName: overrides.firstName ?? 'Ravi', lastName: 'Kumar', email: overrides.email ?? 'ravi@example.com', phone: overrides.phone ?? '9999999999' },
    tenant: { name: 'Test Pharma', code: 'test-pharma' },
    createdAt: '', updatedAt: '',
  }
}

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

function renderSection() {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <MemoryRouter>
        <DivisionMrsSection tenantId="t-1" divisionId="div-1" />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('DivisionMrsSection', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('renders the MR list from useRoles', () => {
    mockPermission(true)
    mockRoleType()
    vi.mocked(useRoles).mockReturnValue({
      data: { success: true, message: '', data: { items: [mrFixture()], count: 1 } },
      isLoading: false, isError: false, error: null, refetch: vi.fn(),
    } as unknown as ReturnType<typeof useRoles>)

    renderSection()

    expect(screen.getByText('MRs')).toBeInTheDocument()
    expect(screen.getByText('1 total')).toBeInTheDocument()
    expect(screen.getByText('Ravi Kumar')).toBeInTheDocument()
    expect(screen.getByText('ravi@example.com')).toBeInTheDocument()
  })

  it('queries with `user`, not `name`, for the search term', async () => {
    mockPermission(true)
    mockRoleType()
    vi.mocked(useRoles).mockReturnValue({
      data: { success: true, message: '', data: { items: [], count: 0 } },
      isLoading: false, isError: false, error: null, refetch: vi.fn(),
    } as unknown as ReturnType<typeof useRoles>)

    const user = userEvent.setup()
    renderSection()

    await user.type(screen.getByPlaceholderText(/search by name or email/i), 'ravi')

    await waitFor(() => {
      const lastCall = vi.mocked(useRoles).mock.calls.at(-1)
      expect(lastCall?.[0]).toMatchObject({ user: 'ravi' })
      expect(lastCall?.[0]).not.toHaveProperty('name')
    }, { timeout: 1000 })
  })

  it('debounces the search input, not firing on every keystroke', async () => {
    mockPermission(true)
    mockRoleType()
    vi.mocked(useRoles).mockReturnValue({
      data: { success: true, message: '', data: { items: [], count: 0 } },
      isLoading: false, isError: false, error: null, refetch: vi.fn(),
    } as unknown as ReturnType<typeof useRoles>)

    const user = userEvent.setup()
    renderSection()

    await user.type(screen.getByPlaceholderText(/search by name or email/i), 'ravi')
    // No call so far should carry any partial term (r/ra/rav) — only the
    // initial undefined `user` or the final debounced 'ravi'.
    const partialTerms = vi.mocked(useRoles).mock.calls
      .map((call) => call[0].user)
      .filter((term): term is string => typeof term === 'string' && term !== 'ravi')
    expect(partialTerms).toEqual([])

    await waitFor(() => {
      const lastCall = vi.mocked(useRoles).mock.calls.at(-1)
      expect(lastCall?.[0]).toMatchObject({ user: 'ravi' })
    }, { timeout: 1000 })
  })

  it('resets to page 1 when the search term changes', async () => {
    mockPermission(true)
    mockRoleType()
    vi.mocked(useRoles).mockReturnValue({
      data: { success: true, message: '', data: { items: Array.from({ length: 25 }, (_, i) => mrFixture({ id: `role-${i}` })), count: 25 } },
      isLoading: false, isError: false, error: null, refetch: vi.fn(),
    } as unknown as ReturnType<typeof useRoles>)

    const user = userEvent.setup()
    renderSection()

    await user.click(screen.getByRole('button', { name: /next/i }))
    await waitFor(() => expect(vi.mocked(useRoles).mock.calls.at(-1)?.[0]).toMatchObject({ page: '2' }))

    await user.type(screen.getByPlaceholderText(/search by name or email/i), 'x')
    await waitFor(() => expect(vi.mocked(useRoles).mock.calls.at(-1)?.[0]).toMatchObject({ page: '1' }), { timeout: 1000 })
  })

  it('resets to page 1 when the status filter changes', async () => {
    mockPermission(true)
    mockRoleType()
    vi.mocked(useRoles).mockReturnValue({
      data: { success: true, message: '', data: { items: Array.from({ length: 25 }, (_, i) => mrFixture({ id: `role-${i}` })), count: 25 } },
      isLoading: false, isError: false, error: null, refetch: vi.fn(),
    } as unknown as ReturnType<typeof useRoles>)

    const user = userEvent.setup()
    renderSection()

    await user.click(screen.getByRole('button', { name: /next/i }))
    await waitFor(() => expect(vi.mocked(useRoles).mock.calls.at(-1)?.[0]).toMatchObject({ page: '2' }))

    await user.click(screen.getByRole('combobox'))
    await user.click(await screen.findByRole('option', { name: /^active$/i }))
    await waitFor(() => expect(vi.mocked(useRoles).mock.calls.at(-1)?.[0]).toMatchObject({ page: '1', status: 'active' }))
  })

  it('never fetches role types or roles, and renders nothing, for a caller lacking tenant:admin/tenant:manage', () => {
    mockPermission(false)
    mockRoleType(null)
    vi.mocked(useRoles).mockReturnValue({
      data: undefined, isLoading: false, isError: false, error: null, refetch: vi.fn(),
    } as unknown as ReturnType<typeof useRoles>)

    const { container } = renderSection()

    expect(container).toBeEmptyDOMElement()
    expect(useRoleTypes).toHaveBeenCalledWith(expect.anything(), false)
    expect(useRoles).toHaveBeenCalledWith(expect.anything(), false)
  })

  it('opens the Add MRs drawer, and closes it after a successful single-MR create', async () => {
    mockPermission(true)
    mockRoleType()
    vi.mocked(useRoles).mockReturnValue({
      data: { success: true, message: '', data: { items: [], count: 0 } },
      isLoading: false, isError: false, error: null, refetch: vi.fn(),
    } as unknown as ReturnType<typeof useRoles>)

    const user = userEvent.setup()
    renderSection()

    await user.click(screen.getByRole('button', { name: /add mrs/i }))
    expect(await screen.findByText('MrProvisioningCard stub')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /simulate single mr created/i }))
    await waitFor(() => expect(screen.queryByText('MrProvisioningCard stub')).not.toBeInTheDocument())
  })

  it('keeps the Add MRs drawer open after a successful CSV import, so the result summary stays visible', async () => {
    mockPermission(true)
    mockRoleType()
    vi.mocked(useRoles).mockReturnValue({
      data: { success: true, message: '', data: { items: [], count: 0 } },
      isLoading: false, isError: false, error: null, refetch: vi.fn(),
    } as unknown as ReturnType<typeof useRoles>)

    const user = userEvent.setup()
    renderSection()

    await user.click(screen.getByRole('button', { name: /add mrs/i }))
    expect(await screen.findByText('MrProvisioningCard stub')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /simulate csv import completed/i }))
    // Give any (incorrect) async close a chance to happen before asserting
    // the drawer is still open — a real bug here would close asynchronously.
    await new Promise((r) => setTimeout(r, 50))
    expect(screen.getByText('MrProvisioningCard stub')).toBeInTheDocument()
  })

  it('shows a "role type missing" message, not a bare empty list, when the tenant has no pharma-mr role type configured', () => {
    mockPermission(true)
    mockRoleType(null)
    vi.mocked(useRoles).mockReturnValue({
      data: undefined, isLoading: false, isError: false, error: null, refetch: vi.fn(),
    } as unknown as ReturnType<typeof useRoles>)

    renderSection()

    expect(screen.getByText(/missing a required role type/i)).toBeInTheDocument()
    // Must not render alongside "No MRs found." — that would falsely imply
    // a real, empty query result rather than an unresolved config error.
    expect(screen.queryByText(/no mrs found/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('shows a retry-able error message when the role-type lookup itself fails', async () => {
    mockPermission(true)
    const refetchMrType = vi.fn()
    vi.mocked(useRoleTypes).mockReturnValue({
      data: undefined, isLoading: false, isError: true, refetch: refetchMrType,
    } as unknown as ReturnType<typeof useRoleTypes>)
    vi.mocked(useRoles).mockReturnValue({
      data: undefined, isLoading: false, isError: false, error: null, refetch: vi.fn(),
    } as unknown as ReturnType<typeof useRoles>)

    const user = userEvent.setup()
    renderSection()

    expect(screen.getByText(/couldn't load role configuration/i)).toBeInTheDocument()
    // Same exclusivity requirement as the "missing" case above.
    expect(screen.queryByText(/no mrs found/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /retry/i }))
    expect(refetchMrType).toHaveBeenCalledTimes(1)
  })

  it('shows an empty state when the division has zero MRs', () => {
    mockPermission(true)
    mockRoleType()
    vi.mocked(useRoles).mockReturnValue({
      data: { success: true, message: '', data: { items: [], count: 0 } },
      isLoading: false, isError: false, error: null, refetch: vi.fn(),
    } as unknown as ReturnType<typeof useRoles>)

    renderSection()

    expect(screen.getByText(/no mrs found/i)).toBeInTheDocument()
  })
})
