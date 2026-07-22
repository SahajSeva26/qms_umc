import { useMemo, useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import { useUsers } from '@/features/admin/hooks/useUsers'
import { adminService } from '@/features/admin/admin.service'
import UsersTable from '@/features/admin/components/UsersTable'
import UsersFilterBar from '@/features/admin/components/UsersFilterBar'
import { useUsersFilters } from '@/features/admin/hooks/useUsersFilters'
import PaginationControls from '@/components/ui/PaginationControls'
import { useRoles } from '@/features/access-management/role/hooks/useRoles'
import { useTenants } from '@/features/access-management/tenant/hooks/useTenants'
import type { User, UserStatus } from '@/types/user.types'

const PAGE_SIZE = 10
// GET /users defaults to status=active when no status filter is sent, and has
// no "all statuses" sentinel value (see user.service.ts) — so an "All" view
// (or a Tenant filter, which also isn't a User-model field the backend can
// filter on) is built by fetching generously and paginating client-side,
// rather than one paginated server-side query. Real users total in the
// dozens today, so this cap is generous without risking silent truncation.
const CLIENT_SIDE_FETCH_LIMIT = 200
const ALL_USER_STATUSES: UserStatus[] = ['active', 'inactive', 'suspended', 'deleted']

const UsersPage = () => {
  const { filters, setFilter, reset } = useUsersFilters()
  const [page, setPage] = useState(1)

  // Tenant isn't a field GET /users can filter on (it lives on the Role a
  // user is bound to, not the User itself) — whenever it's active, or "All
  // statuses" is selected, pagination has to happen client-side over a
  // generously-fetched set instead of the server's page/limit, since the
  // server can't apply this filter for us.
  const needsClientSidePagination = filters.status === 'ALL' || filters.tenant !== 'ALL'

  // Server-paginated path: a single specific status, no tenant filter.
  // Disabled (via `enabled`) whenever the client-side path is active instead,
  // so this doesn't fire a redundant/stale request.
  const singleStatusQuery = useUsers(
    { name: filters.search || undefined, status: filters.status as UserStatus, page, limit: PAGE_SIZE },
    !needsClientSidePagination,
  )

  // Client-side path: one request per real status (or just the selected one),
  // fetched generously, merged/filtered/paginated locally.
  const statusesToFetch = filters.status === 'ALL' ? ALL_USER_STATUSES : [filters.status as UserStatus]
  const clientSideQueries = useQueries({
    queries: needsClientSidePagination
      ? statusesToFetch.map((status) => ({
          queryKey: ['users', { name: filters.search || undefined, status, limit: CLIENT_SIDE_FETCH_LIMIT }],
          queryFn: () => adminService.searchUsers({ name: filters.search || undefined, status, limit: CLIENT_SIDE_FETCH_LIMIT }),
        }))
      : [],
  })

  const clientSideMerged = useMemo(() => {
    if (!needsClientSidePagination) return null
    const merged: User[] = []
    for (const q of clientSideQueries) {
      if (q.data?.data) merged.push(...q.data.data.items)
    }
    merged.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
    return merged
  }, [needsClientSidePagination, clientSideQueries])

  const isLoading = needsClientSidePagination ? clientSideQueries.some((q) => q.isLoading) : singleStatusQuery.isLoading
  const isError = needsClientSidePagination ? clientSideQueries.some((q) => q.isError) : singleStatusQuery.isError

  // Real bound-Role lookup, keyed by email (RolePopulatedUser carries no id
  // of its own — see accessManagement.types.ts), so UsersTable can show each
  // user's actual RoleType instead of admin.mock.ts's fake hash-derived one,
  // and so the Tenant filter below can match each user's real binding.
  // Requires tenant:admin/tenant:manage (GET /roles's real permission gate) —
  // callers without it get a 403 here, handled as "unknown, show nothing"
  // rather than breaking the whole Users screen. Fetched with a generous
  // limit — GET /roles defaults to 10 results per page same as GET /users,
  // and this lookup needs every role, not just the first page's worth.
  const { data: rolesData, isLoading: isLoadingRoles, isError: isRolesError } = useRoles({ limit: String(CLIENT_SIDE_FETCH_LIMIT) })
  const roles = rolesData?.data?.items ?? []

  const roleTypeByEmail = useMemo(() => {
    const map = new Map<string, string>()
    for (const role of roles) {
      if (typeof role.user === 'object' && role.user?.email && typeof role.type === 'object' && role.type?.name) {
        map.set(role.user.email, role.type.name)
      }
    }
    return map
  }, [roles])

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

  const { data: tenantsData } = useTenants({ limit: String(CLIENT_SIDE_FETCH_LIMIT) })
  const tenantOptions = useMemo(
    () => (tenantsData?.data?.items ?? []).map((t) => ({ id: t.id, label: t.name })),
    [tenantsData],
  )

  const users = useMemo(() => {
    if (!needsClientSidePagination) {
      return singleStatusQuery.data?.data?.items ?? []
    }
    const filtered = (clientSideMerged ?? []).filter((user) => {
      if (filters.tenant !== 'ALL' && tenantByEmail.get(user.email) !== filters.tenant) return false
      return true
    })
    return filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  }, [needsClientSidePagination, singleStatusQuery.data, clientSideMerged, filters.tenant, tenantByEmail, page])

  const totalCount = useMemo(() => {
    if (!needsClientSidePagination) return singleStatusQuery.data?.data?.count ?? 0
    return (clientSideMerged ?? []).filter((user) => {
      if (filters.tenant !== 'ALL' && tenantByEmail.get(user.email) !== filters.tenant) return false
      return true
    }).length
  }, [needsClientSidePagination, singleStatusQuery.data, clientSideMerged, filters.tenant, tenantByEmail])

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
    <div className="max-w-5xl">
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
          <UsersTable users={users} roleTypeByEmail={roleTypeByEmail} isLoadingRoles={isLoadingRoles && !isRolesError} />
          <PaginationControls page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  )
}

export default UsersPage
