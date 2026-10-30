import { usePermissionGroups } from '@/features/access-management/permission-group/hooks/usePermissionGroups'
import { usePermissionGroupsFilters } from '@/features/access-management/permission-group/hooks/usePermissionGroupsFilters'
import { useTenants } from '@/features/access-management/tenant'
import PermissionGroupsTable from '@/features/access-management/permission-group/components/PermissionGroupsTable'
import PermissionGroupsFilterBar from '@/features/access-management/permission-group/components/PermissionGroupsFilterBar'
import PaginationControls from '@/components/ui/PaginationControls'
import QueryStateBlock from '@/components/ui/QueryStateBlock'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { usePagination } from '@/hooks/usePagination'
import { usePermission } from '@/hooks/usePermission'
import type { PermissionGroupStatus } from '@/types/accessManagement.types'

const PAGE_SIZE = 10

const PermissionGroupsListPage = () => {
  const { filters, setFilter, reset } = usePermissionGroupsFilters()
  const { page, setPage, totalPages, resetToFirstPage } = usePagination(PAGE_SIZE)
  const { hasAnyPermission } = usePermission()
  // GET /permission-groups/:id needs permission-group:get — distinct from the list's search/tenant:admin gate.
  const canOpenDetail = hasAnyPermission(['permission-group:get'])
  // GET /tenants (Company filter) needs tenant:search/tenant:manage — permission-group:search alone lacks both.
  const canFilterByTenant = hasAnyPermission(['tenant:search', 'tenant:manage'])

  const debouncedSearch = useDebouncedValue(filters.search, 300)

  const { data, isLoading, error, refetch } = usePermissionGroups({
    name: debouncedSearch || undefined,
    status: filters.status === 'ALL' ? undefined : (filters.status as PermissionGroupStatus),
    tenant: filters.tenant === 'ALL' ? undefined : filters.tenant,
    page: String(page),
    limit: String(PAGE_SIZE),
  })
  const groups = data?.data?.items ?? []
  const totalCount = data?.data?.count ?? 0

  const { data: tenantsData } = useTenants({}, canFilterByTenant)
  const tenantOptions = (tenantsData?.data?.items ?? []).map((t) => ({ id: t.id, label: t.name }))
  const tenantLabelById = new Map(tenantOptions.map((t) => [t.id, t.label]))

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
          Permission Groups
        </h1>
        <p className="text-[13px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>
          {!isLoading && !error ? `${totalCount} total` : 'Manage permission groups and the permissions they grant.'}
        </p>
      </div>

      <PermissionGroupsFilterBar filters={filters} setFilter={handleFilterChange} reset={handleReset} tenantOptions={tenantOptions} canFilterByTenant={canFilterByTenant} />

      <QueryStateBlock isLoading={isLoading} error={error} loadingLabel="Loading permission groups…" errorLabel="Failed to load permission groups. Please try again." onRetry={refetch}>
        <PermissionGroupsTable groups={groups} tenantLabelById={tenantLabelById} canOpenDetail={canOpenDetail} />
        <PaginationControls page={page} totalPages={totalPages(totalCount)} onPageChange={setPage} />
      </QueryStateBlock>
    </div>
  )
}

export default PermissionGroupsListPage
