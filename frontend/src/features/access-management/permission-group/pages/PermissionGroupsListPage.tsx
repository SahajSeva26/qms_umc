import { useState } from 'react'
import { usePermissionGroups } from '@/features/access-management/permission-group/hooks/usePermissionGroups'
import { usePermissionGroupsFilters } from '@/features/access-management/permission-group/hooks/usePermissionGroupsFilters'
import { useTenants } from '@/features/access-management/tenant/hooks/useTenants'
import PermissionGroupsTable from '@/features/access-management/permission-group/components/PermissionGroupsTable'
import PermissionGroupsFilterBar from '@/features/access-management/permission-group/components/PermissionGroupsFilterBar'
import PaginationControls from '@/components/ui/PaginationControls'
import type { PermissionGroupStatus } from '@/types/accessManagement.types'

const PAGE_SIZE = 10

// Matches `@/features/access-management/role-type/pages/RoleTypesListPage.tsx`'s
// filter+pagination shape exactly: a filters hook + filter bar (Status +
// Tenant + Search) feeding real server-side pagination via
// SearchPermissionGroupQuery's own status/tenant/page/limit fields (already
// supported server-side, just never wired up on this page before).
const PermissionGroupsListPage = () => {
  const { filters, setFilter, reset } = usePermissionGroupsFilters()
  const [page, setPage] = useState(1)

  const { data, isLoading, error } = usePermissionGroups({
    name: filters.search || undefined,
    status: filters.status === 'ALL' ? undefined : (filters.status as PermissionGroupStatus),
    tenant: filters.tenant === 'ALL' ? undefined : filters.tenant,
    page: String(page),
    limit: String(PAGE_SIZE),
  })
  const groups = data?.data?.items ?? []
  const totalCount = data?.data?.count ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  const { data: tenantsData } = useTenants({})
  const tenantOptions = (tenantsData?.data?.items ?? []).map((t) => ({ id: t.id, label: t.name }))
  const tenantLabelById = new Map(tenantOptions.map((t) => [t.id, t.label]))

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
          Permission Groups
        </h1>
        <p className="text-[13px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>
          {!isLoading && !error ? `${totalCount} total` : 'Manage permission groups and the permissions they grant.'}
        </p>
      </div>

      <PermissionGroupsFilterBar filters={filters} setFilter={handleFilterChange} reset={handleReset} tenantOptions={tenantOptions} />

      {isLoading && (
        <div className="text-[13px] py-10 text-center" style={{ color: 'var(--qms-text-muted)' }}>
          Loading permission groups…
        </div>
      )}

      {error && !isLoading && (
        <div className="text-[13px] rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">
          Failed to load permission groups. Please try again.
        </div>
      )}

      {!isLoading && !error && (
        <>
          <PermissionGroupsTable groups={groups} tenantLabelById={tenantLabelById} />
          <PaginationControls page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  )
}

export default PermissionGroupsListPage
