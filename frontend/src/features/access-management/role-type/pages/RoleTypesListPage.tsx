import { useNavigate } from 'react-router-dom'
import { FiPlus } from 'react-icons/fi'
import { useRoleTypes } from '@/features/access-management/role-type/hooks/useRoleTypes'
import { useRoleTypesFilters } from '@/features/access-management/role-type/hooks/useRoleTypesFilters'
import { useTenants } from '@/features/access-management/tenant/hooks/useTenants'
import RoleTypesTable from '@/features/access-management/role-type/components/RoleTypesTable'
import RoleTypesFilterBar from '@/features/access-management/role-type/components/RoleTypesFilterBar'
import PaginationControls from '@/components/ui/PaginationControls'
import QueryStateBlock from '@/components/ui/QueryStateBlock'
import { ROLE_TYPE_ROUTES } from '@/features/access-management/role-type/role-type.routes'
import { Button } from '@/components/ui/button'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { usePagination } from '@/hooks/usePagination'
import type { RoleTypeStatus } from '@/features/access-management/accessManagement.types'

const PAGE_SIZE = 10

// Shows every role type across every tenant by default; Status/Tenant/Search
// narrow via real server-side pagination, all applied in the backend's where-clause.
const RoleTypesListPage = () => {
  const navigate = useNavigate()
  const { filters, setFilter, reset } = useRoleTypesFilters()
  const { page, setPage, totalPages, resetToFirstPage } = usePagination(PAGE_SIZE)

  const debouncedSearch = useDebouncedValue(filters.search, 300)

  const { data, isLoading, error, refetch } = useRoleTypes({
    name: debouncedSearch || undefined,
    status: filters.status === 'ALL' ? undefined : (filters.status as RoleTypeStatus),
    tenant: filters.tenant === 'ALL' ? undefined : filters.tenant,
    page: String(page),
    limit: String(PAGE_SIZE),
  })
  const roleTypes = data?.data?.items ?? []
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
            Role Types
          </h1>
          <p className="text-[13px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>
            {!isLoading && !error ? `${totalCount} total` : 'Manage role types across companies.'}
          </p>
        </div>
        <Button
          onClick={() => navigate(ROLE_TYPE_ROUTES.ROLE_TYPE_NEW)}
          className="text-white shrink-0"
          style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
        >
          <FiPlus size={14} /> New Role Type
        </Button>
      </div>

      <RoleTypesFilterBar filters={filters} setFilter={handleFilterChange} reset={handleReset} tenantOptions={tenantOptions} />

      <QueryStateBlock isLoading={isLoading} error={error} loadingLabel="Loading role types…" errorLabel="Failed to load role types. Please try again." onRetry={refetch}>
        <RoleTypesTable roleTypes={roleTypes} />
        <PaginationControls page={page} totalPages={totalPages(totalCount)} onPageChange={setPage} />
      </QueryStateBlock>
    </div>
  )
}

export default RoleTypesListPage
