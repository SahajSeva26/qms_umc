import { useTenants } from '@/features/access-management/tenant/hooks/useTenants'
import { useTenantsFilters } from '@/features/access-management/tenant/hooks/useTenantsFilters'
import TenantsTable from '@/features/access-management/tenant/components/TenantsTable'
import TenantsFilterBar from '@/features/access-management/tenant/components/TenantsFilterBar'
import CreateTenantDialog from '@/features/access-management/tenant/components/CreateTenantDialog'
import PaginationControls from '@/components/ui/PaginationControls'
import QueryStateBlock from '@/components/ui/QueryStateBlock'
import { usePermission } from '@/hooks/usePermission'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { usePagination } from '@/hooks/usePagination'
import type { TenantStatus } from '@/types/accessManagement.types'

const PAGE_SIZE = 10

const TenantsListPage = () => {
  const { filters, setFilter, reset } = useTenantsFilters()
  const { page, setPage, totalPages, resetToFirstPage } = usePagination(PAGE_SIZE)
  // Page is reachable by tenant:get/tenant:search alone, but only tenant:manage
  // can actually submit — gate the "New Tenant" button so read-only viewers can't 403.
  const { hasPermission } = usePermission()
  const canManageTenant = hasPermission('tenant:manage')
  // The tenant-type filter (platform vs customer) is system:manage-only —
  // everyone else stays hard-locked to customer tenants, matching this
  // page's own "Client Management" scope, regardless of the filter state.
  const canFilterByType = hasPermission('system:manage')

  const debouncedSearch = useDebouncedValue(filters.search, 300)

  const { data, isLoading, error, refetch } = useTenants({
    name: debouncedSearch || undefined,
    status: filters.status === 'ALL' ? undefined : (filters.status as TenantStatus),
    type: canFilterByType ? (filters.type === 'ALL' ? undefined : filters.type) : 'customer',
    page: String(page),
    limit: String(PAGE_SIZE),
  })
  const tenants = data?.data?.items ?? []
  const totalCount = data?.data?.count ?? 0

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
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--qms-text)' }}>
            Client Management
          </h1>
          <p className="text-[13px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>
            {!isLoading && !error ? `${totalCount} total` : 'Manage your clients.'}
          </p>
        </div>
        {canManageTenant && <CreateTenantDialog />}
      </div>

      <TenantsFilterBar filters={filters} setFilter={handleFilterChange} reset={handleReset} canFilterByType={canFilterByType} />

      <QueryStateBlock isLoading={isLoading} error={error} loadingLabel="Loading clients…" errorLabel="Failed to load clients. Please try again." onRetry={refetch}>
        <TenantsTable tenants={tenants} />
        <PaginationControls page={page} totalPages={totalPages(totalCount)} onPageChange={setPage} />
      </QueryStateBlock>
    </div>
  )
}

export default TenantsListPage
