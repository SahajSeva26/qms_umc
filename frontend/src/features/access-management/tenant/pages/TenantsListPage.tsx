import { useState } from 'react'
import { useTenants } from '@/features/access-management/tenant/hooks/useTenants'
import { useTenantsFilters } from '@/features/access-management/tenant/hooks/useTenantsFilters'
import TenantsTable from '@/features/access-management/tenant/components/TenantsTable'
import TenantsFilterBar from '@/features/access-management/tenant/components/TenantsFilterBar'
import CreateTenantDialog from '@/features/access-management/tenant/components/CreateTenantDialog'
import PaginationControls from '@/components/ui/PaginationControls'
import type { TenantStatus } from '@/types/accessManagement.types'

const PAGE_SIZE = 10

// Matches `@/features/access-management/role-type/pages/RoleTypesListPage.tsx`'s
// filter+pagination shape exactly: a filters hook + filter bar (Status +
// Search) feeding real server-side pagination via SearchTenantQuery's own
// status/page/limit fields (already supported server-side, just never wired
// up on this page before).
const TenantsListPage = () => {
  const { filters, setFilter, reset } = useTenantsFilters()
  const [page, setPage] = useState(1)

  const { data, isLoading, error } = useTenants({
    name: filters.search || undefined,
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
    <div className="max-w-5xl">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--qms-text)' }}>
            Tenants
          </h1>
          <p className="text-[13px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>
            {!isLoading && !error ? `${totalCount} total` : 'Manage tenants on the platform.'}
          </p>
        </div>
        <CreateTenantDialog />
      </div>

      <TenantsFilterBar filters={filters} setFilter={handleFilterChange} reset={handleReset} />

      {isLoading && (
        <div className="text-[13px] py-10 text-center" style={{ color: 'var(--qms-text-muted)' }}>
          Loading tenants…
        </div>
      )}

      {error && !isLoading && (
        <div className="text-[13px] rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">
          Failed to load tenants. Please try again.
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
