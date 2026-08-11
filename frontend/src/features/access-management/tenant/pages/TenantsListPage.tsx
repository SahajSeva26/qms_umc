import { useState } from 'react'
import { useTenants } from '@/features/access-management/tenant/hooks/useTenants'
import { useTenantsFilters } from '@/features/access-management/tenant/hooks/useTenantsFilters'
import TenantsTable from '@/features/access-management/tenant/components/TenantsTable'
import TenantsFilterBar from '@/features/access-management/tenant/components/TenantsFilterBar'
import CreateTenantDialog from '@/features/access-management/tenant/components/CreateTenantDialog'
import PaginationControls from '@/components/ui/PaginationControls'
import { usePermission } from '@/hooks/usePermission'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import type { TenantStatus } from '@/types/accessManagement.types'

const PAGE_SIZE = 10

// Same convention as RolesListPage.tsx: filters feed the react-query hook
// directly, with real server-side pagination since status/search are both
// genuinely applied in the backend's where-clause.
const TenantsListPage = () => {
  const { filters, setFilter, reset } = useTenantsFilters()
  const [page, setPage] = useState(1)
  // Backend's real POST /tenants guard only accepts tenant:manage/system:manage,
  // but this page itself is reachable by tenant:get/tenant:search alone — the
  // "New Tenant" button rendered unconditionally for any of those 3, so a
  // read-only tenant viewer could open the dialog and fill it out only to
  // 403 on submit. Mirrors TenantDetailPage.tsx's own canManageTenant gate.
  // Found via a 2026-07-24 test sweep.
  const { hasPermission } = usePermission()
  const canManageTenant = hasPermission('tenant:manage')

  // Debounced
  const debouncedSearch = useDebouncedValue(filters.search, 300)

  const { data, isLoading, error } = useTenants({
    name: debouncedSearch || undefined,
    status: filters.status === 'ALL' ? undefined : (filters.status as TenantStatus),
    page: String(page),
    limit: String(PAGE_SIZE),
  })
  const tenants = data?.data?.items ?? []
  const totalCount = data?.data?.count ?? 0
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

      <TenantsFilterBar filters={filters} setFilter={handleFilterChange} reset={handleReset} />

      {isLoading && (
        <div className="text-[13px] py-10 text-center" style={{ color: 'var(--qms-text-muted)' }}>
          Loading clients…
        </div>
      )}

      {error && !isLoading && (
        <div className="text-[13px] rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">
          Failed to load clients. Please try again.
        </div>
      )}

      {!isLoading && !error && (
        <>
          <TenantsTable tenants={tenants} />
          <PaginationControls page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  )
}

export default TenantsListPage
