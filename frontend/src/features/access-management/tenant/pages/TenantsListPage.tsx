import { Building2 } from 'lucide-react'
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
  // tenant:manage (or the system:manage bypass) can submit — gate the button so read-only viewers can't 403.
  const { hasPermission } = usePermission()
  const canManageTenant = hasPermission('tenant:manage')
  // Type filter (platform vs customer) is system:manage-only — everyone else
  // stays hard-locked to customer tenants regardless of the filter state.
  const canFilterByType = hasPermission('system:manage')

  const debouncedSearch = useDebouncedValue(filters.search, 300)

  const { data, isLoading, error, refetch } = useTenants({
    name: debouncedSearch || undefined,
    status: filters.status === 'ALL' ? undefined : (filters.status as TenantStatus),
    type: canFilterByType ? (filters.type === 'ALL' ? undefined : filters.type) : 'customer',
    page: String(page),
    limit: String(PAGE_SIZE),
    // PAGE_SIZE (10) stays under the backend's report-mode cap of 20.
    report: 'true',
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
    // --cm-accent: prototype's --violet-500, scoped to this page only — --qms-brand stays untouched.
    <div className="w-full" style={{ ['--cm-accent' as string]: '#8b5cf6' }}>
      {/* Shell header (prototype's cm-tpl template) — distinct from the view-level crumbs/H2 below. */}
      <div className="mb-1 text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>
        Master · Client Management
      </div>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--qms-text)', letterSpacing: '-0.02em' }}>
            Client Management
          </h1>
          <div className="flex items-center gap-2 mt-1.5">
            {/* Matches the prototype's generic .chip (styles.css) — dot is always green, never page accent. */}
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[12px] font-medium"
              style={{ background: 'var(--qms-surface-strong)', border: '1px solid var(--qms-border)', color: 'var(--qms-text-soft)' }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#10b981', boxShadow: '0 0 0 4px rgba(16,185,129,.18)' }} />
              Read-only analytics
            </span>
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[12px] font-medium"
              style={{ background: 'var(--qms-surface-strong)', border: '1px solid var(--qms-border)', color: 'var(--qms-text-soft)' }}
            >
              <Building2 className="w-3 h-3" />
              Clients · Divisions · MRs
            </span>
          </div>
        </div>
        {canManageTenant && <CreateTenantDialog />}
      </div>

      {/* Prototype's .cm-crumbs — styled like a link even though this IS the root view (no nav target). */}
      <div className="text-[12px] mb-3.5">
        <span className="font-bold" style={{ color: 'var(--cm-accent)' }}>Clients</span>
      </div>

      <h2 className="text-[19px] font-extrabold mb-0.5" style={{ color: 'var(--qms-text)' }}>
        All Clients
      </h2>
      <p className="text-[12px] mb-3" style={{ color: 'var(--qms-text-muted)' }}>
        {!isLoading && !error ? `${totalCount} client(s) · click a row to open the profile` : 'Manage your clients.'}
      </p>

      <TenantsFilterBar filters={filters} setFilter={handleFilterChange} reset={handleReset} canFilterByType={canFilterByType} />

      <QueryStateBlock isLoading={isLoading} error={error} loadingLabel="Loading clients…" errorLabel="Failed to load clients. Please try again." onRetry={refetch}>
        <TenantsTable tenants={tenants} />
        <PaginationControls page={page} totalPages={totalPages(totalCount)} onPageChange={setPage} />
      </QueryStateBlock>
    </div>
  )
}

export default TenantsListPage
