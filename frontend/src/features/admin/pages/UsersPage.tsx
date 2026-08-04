import { useMemo, useState } from 'react'
import { useUsers } from '@/features/admin/hooks/useUsers'
import { adminService } from '@/features/admin/admin.service'
import UsersTable from '@/features/admin/components/UsersTable'
import UsersFilterBar from '@/features/admin/components/UsersFilterBar'
import { useUsersFilters } from '@/features/admin/hooks/useUsersFilters'
import PaginationControls from '@/components/ui/PaginationControls'
import { useRoles } from '@/features/access-management/role/hooks/useRoles'
import { useTenants } from '@/features/access-management/tenant/hooks/useTenants'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useQuery } from '@tanstack/react-query'

const PAGE_SIZE = 10
// Tenant isn't a field GET /users can filter on (it lives on the Role a user
// is bound to, not the User itself), so whenever the Tenant filter is active,
// pagination happens client-side over a generously-fetched single-status set
// instead of the server's page/limit. Real users total in the dozens today,
// so this cap is generous without risking silent truncation.
const CLIENT_SIDE_FETCH_LIMIT = 200

const UsersPage = () => {
  const { filters, setFilter, reset } = useUsersFilters()
  const [page, setPage] = useState(1)

  // Debounced so each keystroke doesn't fire its own request — only the
  // value still present 300ms after typing stops flows into the query below.
  const debouncedSearch = useDebouncedValue(filters.search, 300)

  const needsClientSidePagination = filters.tenant !== 'ALL'

  // Server-paginated path: no tenant filter active. Disabled (via `enabled`)
  // whenever the client-side path is active instead, so this doesn't fire a
  // redundant/stale request.
  const singleStatusQuery = useUsers(
    { name: debouncedSearch || undefined, status: filters.status, page, limit: PAGE_SIZE },
    !needsClientSidePagination,
  )

  // Client-side path: one generously-fetched request for the selected status,
  // filtered/paginated locally by tenant afterward.
  const clientSideQuery = useQuery({
    queryKey: ['users', { name: debouncedSearch || undefined, status: filters.status, limit: CLIENT_SIDE_FETCH_LIMIT }],
    queryFn: () => adminService.searchUsers({ name: debouncedSearch || undefined, status: filters.status, limit: CLIENT_SIDE_FETCH_LIMIT }),
    enabled: needsClientSidePagination,
  })

  const isLoading = needsClientSidePagination ? clientSideQuery.isLoading : singleStatusQuery.isLoading
  const isError = needsClientSidePagination ? clientSideQuery.isError : singleStatusQuery.isError

  // Both queries below only exist to power the Company filter dropdown and
  // its email->tenant matching — neither fires until that dropdown has been
  // opened at least once (see onCompanyDropdownOpen), since most page visits
  // never touch this filter at all.
  const [companyFilterTouched, setCompanyFilterTouched] = useState(false)

  // Real bound-Role lookup, keyed by email (RolePopulatedUser carries no id
  // of its own — see accessManagement.types.ts) — the only way to resolve a
  // user's tenant, since User itself has no tenant field. Requires
  // tenant:admin/tenant:manage (GET /roles's real permission gate) — callers
  // without it get a 403 here, handled as "unknown, show nothing" rather than
  // breaking the whole Users screen. Fetched with a generous limit — GET
  // /roles defaults to 10 results per page same as GET /users, and this
  // lookup needs every role, not just the first page's worth.
  const { data: rolesData } = useRoles({ limit: String(CLIENT_SIDE_FETCH_LIMIT) }, companyFilterTouched)
  const roles = rolesData?.data?.items ?? []

  // role.tenant is a nested populated relation, which carries Mongoose's raw
  // `_id` (not the mapped `id` the top-level Tenant entity has — see
  // RolePopulatedTenant's comment).
  const tenantByEmail = useMemo(() => {
    const map = new Map<string, string>()
    for (const role of roles) {
      if (typeof role.user === 'object' && role.user?.email && typeof role.tenant === 'object' && role.tenant?._id) {
        map.set(role.user.email, role.tenant._id)
      }
    }
    return map
  }, [roles])

  const { data: tenantsData } = useTenants({ limit: String(CLIENT_SIDE_FETCH_LIMIT) }, companyFilterTouched)
  const tenantOptions = useMemo(
    () => (tenantsData?.data?.items ?? []).map((t) => ({ id: t.id, label: t.name })),
    [tenantsData],
  )

  const tenantFiltered = useMemo(() => {
    if (!needsClientSidePagination) return null
    const items = clientSideQuery.data?.data?.items ?? []
    return items.filter((user) => tenantByEmail.get(user.email) === filters.tenant)
  }, [needsClientSidePagination, clientSideQuery.data, filters.tenant, tenantByEmail])

  const users = useMemo(() => {
    if (!needsClientSidePagination) return singleStatusQuery.data?.data?.items ?? []
    return (tenantFiltered ?? []).slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  }, [needsClientSidePagination, singleStatusQuery.data, tenantFiltered, page])

  const totalCount = needsClientSidePagination
    ? (tenantFiltered ?? []).length
    : (singleStatusQuery.data?.data?.count ?? 0)

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  const handleFilterChange = <K extends keyof typeof filters>(key: K, value: (typeof filters)[K]) => {
    setFilter(key, value)
    setPage(1)
  }

  const handleReset = () => {
    reset()
    setPage(1)
  }

  return (
    <div className="w-full">
      <div className="mb-5">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--qms-text)' }}>
          Users
        </h1>
        <p className="text-[13px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>
          {!isLoading && !isError ? `${totalCount} total` : 'Manage platform users and their roles.'}
        </p>
      </div>

      <UsersFilterBar
        filters={filters}
        setFilter={handleFilterChange}
        reset={handleReset}
        tenantOptions={tenantOptions}
        onCompanyDropdownOpen={() => setCompanyFilterTouched(true)}
      />

      {isLoading && (
        <div className="text-[13px] py-10 text-center" style={{ color: 'var(--qms-text-muted)' }}>
          Loading users…
        </div>
      )}

      {isError && !isLoading && (
        <div className="text-[13px] rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">
          Failed to load users. Please try again.
        </div>
      )}

      {!isLoading && !isError && (
        <>
          <UsersTable users={users} />
          <PaginationControls page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  )
}

export default UsersPage
