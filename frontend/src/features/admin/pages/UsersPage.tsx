import { useMemo, useState } from 'react'
import { useUsers } from '@/features/admin/hooks/useUsers'
import { adminService } from '@/features/admin/admin.service'
import UsersTable from '@/features/admin/components/UsersTable'
import UsersFilterBar from '@/features/admin/components/UsersFilterBar'
import { useUsersFilters } from '@/features/admin/hooks/useUsersFilters'
import PaginationControls from '@/components/ui/PaginationControls'
import QueryStateBlock from '@/components/ui/QueryStateBlock'
import { useRoles } from '@/features/access-management/role/hooks/useRoles'
import { useTenants } from '@/features/access-management/tenant/hooks/useTenants'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { usePagination } from '@/hooks/usePagination'
import { useQuery } from '@tanstack/react-query'
import { EMPTY_ARRAY } from '@/utils/emptyArray'

const PAGE_SIZE = 10
// Tenant isn't a field GET /users can filter on (it lives on the Role, not the User),
// so the Tenant filter paginates client-side over this capped set instead — truncates past 200 users.
const CLIENT_SIDE_FETCH_LIMIT = 200

const UsersPage = () => {
  const { filters, setFilter, reset } = useUsersFilters()
  const { page, setPage, totalPages, resetToFirstPage } = usePagination(PAGE_SIZE)

  const debouncedSearch = useDebouncedValue(filters.search, 300)

  const needsClientSidePagination = filters.tenant !== 'ALL'

  // Server-paginated path: disabled while the client-side path is active instead.
  const singleStatusQuery = useUsers(
    { name: debouncedSearch || undefined, status: filters.status, page, limit: PAGE_SIZE },
    !needsClientSidePagination,
  )

  // Client-side path: one capped request, filtered/paginated locally by tenant.
  const clientSideQuery = useQuery({
    queryKey: ['users', { name: debouncedSearch || undefined, status: filters.status, limit: CLIENT_SIDE_FETCH_LIMIT }],
    queryFn: () => adminService.searchUsers({ name: debouncedSearch || undefined, status: filters.status, limit: CLIENT_SIDE_FETCH_LIMIT }),
    enabled: needsClientSidePagination,
  })

  const isLoading = needsClientSidePagination ? clientSideQuery.isLoading : singleStatusQuery.isLoading
  const isError = needsClientSidePagination ? clientSideQuery.isError : singleStatusQuery.isError
  const refetchUsers = needsClientSidePagination ? clientSideQuery.refetch : singleStatusQuery.refetch

  // Both queries below only power the Company filter dropdown — neither fires
  // until it's opened at least once (see onCompanyDropdownOpen).
  const [companyFilterTouched, setCompanyFilterTouched] = useState(false)

  // Only way to resolve a user's tenant (User itself has no tenant field).
  // Requires tenant:admin/tenant:manage; a 403 here is handled as "unknown, show nothing".
  const { data: rolesData } = useRoles({ limit: String(CLIENT_SIDE_FETCH_LIMIT) }, companyFilterTouched)
  const roles = rolesData?.data?.items ?? EMPTY_ARRAY

  // role.tenant carries Mongoose's raw `_id`, not the mapped `id` on the top-level Tenant entity.
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

  const handleFilterChange = <K extends keyof typeof filters>(key: K, value: (typeof filters)[K]) => {
    setFilter(key, value)
    resetToFirstPage()
  }

  const handleReset = () => {
    reset()
    resetToFirstPage()
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

      <QueryStateBlock isLoading={isLoading} error={isError} loadingLabel="Loading users…" errorLabel="Failed to load users. Please try again." onRetry={refetchUsers}>
        <UsersTable users={users} />
        <PaginationControls page={page} totalPages={totalPages(totalCount)} onPageChange={setPage} />
      </QueryStateBlock>
    </div>
  )
}

export default UsersPage
