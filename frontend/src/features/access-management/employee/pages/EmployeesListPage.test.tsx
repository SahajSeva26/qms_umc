import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useSearchParams } from 'react-router-dom'
import { usePermission } from '@/hooks/usePermission'

// Renders the live ?search string next to the page so a test can assert the param was actually
// stripped from the URL, not just that the modal never opened.
const SearchParamsProbe = () => {
  const [searchParams] = useSearchParams()
  return <div data-testid="search-params-probe">{searchParams.toString()}</div>
}

vi.mock('@/hooks/usePermission')

const searchEmployees = vi.fn((query: unknown) => query)
vi.mock('@/features/access-management/employee/hooks/useEmployees', () => ({
  useEmployees: (query: unknown) => { searchEmployees(query); return { data: { data: { count: 0, items: [] } }, isLoading: false, error: null, refetch: vi.fn() } },
}))
const useRoleTypesSpy = vi.fn()
vi.mock('@/features/access-management/role-type/hooks/useRoleTypes', () => ({
  useRoleTypes: (query: unknown, enabled: boolean) => {
    useRoleTypesSpy(query, enabled)
    return { data: { data: { items: [{ id: 'rt-fo', code: 'field-officer' }] } }, isLoading: false, error: null }
  },
}))
const useTenantsSpy = vi.fn()
vi.mock('@/features/access-management/tenant/hooks/useTenants', () => ({
  useTenants: (query: unknown, enabled: boolean) => {
    useTenantsSpy(query, enabled)
    return { data: { data: { items: [] } } }
  },
}))
vi.mock('@/features/access-management/role/hooks/useCreateRole', () => ({
  useCreateRole: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false, isError: false, reset: vi.fn() }),
}))
vi.mock('@/features/access-management/employee/hooks/useCreateEmployee', () => ({
  useCreateEmployee: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false, isError: false, reset: vi.fn() }),
}))

function sessionFixture(roleTypeCode: string, tenantType: 'platform' | 'customer' = 'platform') {
  return { tenant: { id: 't-1', type: tenantType }, roleType: { code: roleTypeCode } }
}

async function renderPage(session: ReturnType<typeof sessionFixture> | null, permissions: string[], initialPath = '/admin/employees') {
  vi.mocked(usePermission).mockReturnValue({
    session, permissions, isSettled: true, isFetching: false, isError: false, isConfirmedUnauthenticated: false, refetch: vi.fn(),
  } as unknown as ReturnType<typeof usePermission>)
  const EmployeesListPage = (await import('./EmployeesListPage')).default
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <SearchParamsProbe />
      <Routes>
        <Route path="/admin/employees" element={<EmployeesListPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('EmployeesListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('paginates with the established limit=10 convention', async () => {
    await renderPage(sessionFixture('admin'), ['tenant:admin'])

    await waitFor(() => expect(searchEmployees).toHaveBeenCalled())
    expect(searchEmployees.mock.calls[0]?.[0]).toMatchObject({ limit: '10', page: '1' })
  })

  it('renders the tenant filter (a second combobox, alongside Status) for a platform actor', async () => {
    await renderPage(sessionFixture('admin', 'platform'), ['tenant:admin'])
    await screen.findByText('Employees')
    expect(await screen.findAllByRole('combobox')).toHaveLength(2)
  })

  it('does not render the tenant filter (only the Status combobox) for a customer-tenant actor', async () => {
    await renderPage(sessionFixture('admin', 'customer'), ['tenant:admin'])
    await screen.findByText('Employees')
    expect(screen.getAllByRole('combobox')).toHaveLength(1)
  })

  it('hides "New Employee" entirely when both canOnboardNewPerson and canLinkExistingAccount are false (the real current Ops Manager gap)', async () => {
    await renderPage(sessionFixture('operation-manager-screening'), ['tenant:search', 'tenant:get'])
    await screen.findByText('Employees')
    expect(screen.queryByRole('button', { name: /new employee/i })).not.toBeInTheDocument()
  })

  it('shows "New Employee" for an admin session (both modes usable)', async () => {
    await renderPage(sessionFixture('admin'), ['tenant:admin'])
    expect(await screen.findByRole('button', { name: /new employee/i })).toBeInTheDocument()
  })

  it('a system:manage session sees the button regardless of role-type code', async () => {
    await renderPage(sessionFixture('sales-rep'), ['system:manage'])
    expect(await screen.findByRole('button', { name: /new employee/i })).toBeInTheDocument()
  })

  it('strips ?onboard=new from the URL even when the session cannot use it (canOnboardNewPerson is false) — it must not linger even though nothing opens', async () => {
    await renderPage(sessionFixture('operation-manager-screening'), ['tenant:search', 'tenant:get'], '/admin/employees?onboard=new')
    await screen.findByText('Employees')

    await waitFor(() => expect(screen.getByTestId('search-params-probe')).toHaveTextContent(''))
    expect(screen.queryByText('New employee')).not.toBeInTheDocument()
  })

  it('keeps ?onboard=new in the URL just long enough to open the modal for an authorized session, then strips it', async () => {
    await renderPage(sessionFixture('admin'), ['tenant:admin'], '/admin/employees?onboard=new')

    expect(await screen.findByText('New employee')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByTestId('search-params-probe')).toHaveTextContent(''))
  })

  it('GET /role-types and GET /tenants are permission-gated independently, not by canOnboard || canLink', async () => {
    // tenant:admin satisfies GET /role-types but NOT GET /tenants (tenant:search/tenant:manage only).
    await renderPage(sessionFixture('admin', 'platform'), ['tenant:admin'])
    await screen.findByText('Employees')
    expect(useRoleTypesSpy).toHaveBeenCalledWith(expect.anything(), true)
    expect(useTenantsSpy).toHaveBeenCalledWith(expect.anything(), false)
  })

  it('tenant:search (platform tenant) satisfies GET /tenants but NOT GET /role-types', async () => {
    await renderPage(sessionFixture('admin', 'platform'), ['tenant:search'])
    await screen.findByText('Employees')
    expect(useRoleTypesSpy).toHaveBeenCalledWith(expect.anything(), false)
    expect(useTenantsSpy).toHaveBeenCalledWith(expect.anything(), true)
  })

  it('a role:search-only Ops Manager session gets both reference queries disabled, and never sees "New Employee" — role:search alone is no longer sufficient for canLinkExistingAccount, since it can\'t resolve foTypeId', async () => {
    await renderPage(sessionFixture('operation-manager-screening', 'platform'), ['role:search'])
    await screen.findByText('Employees')
    expect(useRoleTypesSpy).toHaveBeenCalledWith(expect.anything(), false)
    expect(useTenantsSpy).toHaveBeenCalledWith(expect.anything(), false)
    expect(screen.queryByRole('button', { name: /new employee/i })).not.toBeInTheDocument()
  })

  it('an Ops Manager holding tenant:manage sees "New Employee" and gets useRoleTypes enabled — proving the fix doesn\'t overcorrect and block genuinely-capable actors', async () => {
    await renderPage(sessionFixture('operation-manager-screening', 'platform'), ['tenant:manage'])
    await screen.findByText('Employees')
    expect(useRoleTypesSpy).toHaveBeenCalledWith(expect.anything(), true)
    expect(await screen.findByRole('button', { name: /new employee/i })).toBeInTheDocument()
  })

  it('system:manage enables both reference queries regardless of role-type or tenant:* permissions, mirroring the real backend bypass', async () => {
    await renderPage(sessionFixture('sales-rep', 'platform'), ['system:manage'])
    await screen.findByText('Employees')
    expect(useRoleTypesSpy).toHaveBeenCalledWith(expect.anything(), true)
    expect(useTenantsSpy).toHaveBeenCalledWith(expect.anything(), true)
  })

  it('a Field Officer session gets both reference queries disabled', async () => {
    await renderPage(sessionFixture('field-officer', 'platform'), [])
    await screen.findByText('Employees')
    expect(useRoleTypesSpy).toHaveBeenCalledWith(expect.anything(), false)
    expect(useTenantsSpy).toHaveBeenCalledWith(expect.anything(), false)
  })
})
