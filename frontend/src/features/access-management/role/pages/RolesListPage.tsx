import { useNavigate } from 'react-router-dom'
import { FiPlus } from 'react-icons/fi'
import { useRoles } from '@/features/access-management/role/hooks/useRoles'
import { useRolesFilters } from '@/features/access-management/role/hooks/useRolesFilters'
import { useTenants } from '@/features/access-management/tenant/hooks/useTenants'
import RolesTable from '@/features/access-management/role/components/RolesTable'
import RolesFilterBar from '@/features/access-management/role/components/RolesFilterBar'
import PaginationControls from '@/components/ui/PaginationControls'
import QueryStateBlock from '@/components/ui/QueryStateBlock'
import { ROLE_ROUTES } from '@/features/access-management/role/role.routes'
import { Button } from '@/components/ui/button'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { usePagination } from '@/hooks/usePagination'
import type { RoleStatus } from '@/types/accessManagement.types'

const PAGE_SIZE = 10

// Shows every role across every tenant by default; Status/Tenant/Search
// filters and pagination are all applied server-side.
const RolesListPage = () => {
  const navigate = useNavigate()
  const { filters, setFilter, reset } = useRolesFilters()
  const { page, setPage, totalPages, resetToFirstPage } = usePagination(PAGE_SIZE)

  const debouncedSearch = useDebouncedValue(filters.search, 300)

  const { data, isLoading, error, refetch } = useRoles({
    name: debouncedSearch || undefined,
    status: filters.status === 'ALL' ? undefined : (filters.status as RoleStatus),
    tenant: filters.tenant === 'ALL' ? undefined : filters.tenant,
    page: String(page),
    limit: String(PAGE_SIZE),
  })
  const roles = data?.data?.items ?? []
  const totalCount = data?.data?.count ?? 0

  const { data: tenantsData } = useTenants({})
  const tenantOptions = (tenantsData?.data?.items ?? []).map((t) => ({ id: t.id, label: t.name }))

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
            Roles
          </h1>
          <p className="text-[13px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>
            {!isLoading && !error ? `${totalCount} total` : 'Manage roles across companies.'}
          </p>
        </div>
        <Button
          onClick={() => navigate(ROLE_ROUTES.ROLE_NEW)}
          className="text-white shrink-0"
          style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
        >
          <FiPlus size={14} /> New Role
        </Button>
      </div>

      <RolesFilterBar filters={filters} setFilter={handleFilterChange} reset={handleReset} tenantOptions={tenantOptions} />

      <QueryStateBlock isLoading={isLoading} error={error} loadingLabel="Loading roles…" errorLabel="Failed to load roles. Please try again." onRetry={refetch}>
        <RolesTable roles={roles} />
        <PaginationControls page={page} totalPages={totalPages(totalCount)} onPageChange={setPage} />
      </QueryStateBlock>
    </div>
  )
}

export default RolesListPage
