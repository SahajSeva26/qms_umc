import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import RequireEmployeeAccess from '@/components/layouts/RequireEmployeeAccess'
import { usePermission } from '@/hooks/usePermission'
import { usePagination } from '@/hooks/usePagination'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useEmployees } from '@/features/access-management/employee/hooks/useEmployees'
import { useEmployeesFilters } from '@/features/access-management/employee/hooks/useEmployeesFilters'
import { useRoleTypes } from '@/features/access-management/role-type/hooks/useRoleTypes'
import { useTenants } from '@/features/access-management/tenant/hooks/useTenants'
import { canOnboardNewPerson, canLinkExistingAccount } from '@/features/access-management/employee/employeeAccess'
import EmployeesTable from '@/features/access-management/employee/components/EmployeesTable'
import EmployeesFilterBar from '@/features/access-management/employee/components/EmployeesFilterBar'
import CreateEmployeeModal from '@/features/access-management/employee/components/CreateEmployeeModal'
import PaginationControls from '@/components/ui/PaginationControls'
import QueryStateBlock from '@/components/ui/QueryStateBlock'
import type { EmployeeType, EmployeeStatus } from '@/types/accessManagement.types'

const PAGE_SIZE = 10

const EmployeesListContent = () => {
  const { session, permissions } = usePermission()
  const [searchParams, setSearchParams] = useSearchParams()
  const { filters, setFilter, reset } = useEmployeesFilters()
  const { page, setPage, totalPages, resetToFirstPage } = usePagination(PAGE_SIZE)
  const debouncedSearch = useDebouncedValue(filters.search, 300)

  const tenantId = session?.tenant.id
  const isPlatformActor = session?.tenant.type === 'platform'

  // GET /role-types (tenant:admin/tenant:manage) and GET /tenants (tenant:search/tenant:manage)
  // require different permissions — each retains the real system:manage bypass contextBuilder.ts's
  // hasAnyPermissions() grants server-side, even though it isn't in either route's own allow-list.
  const canSearchRoleTypes = permissions.includes('tenant:admin') || permissions.includes('tenant:manage') || permissions.includes('system:manage')
  const canSearchTenants = permissions.includes('tenant:search') || permissions.includes('tenant:manage') || permissions.includes('system:manage')

  const { data: foTypeData } = useRoleTypes({ code: 'field-officer', status: 'active' }, canSearchRoleTypes)
  const foTypeId = foTypeData?.data?.items[0]?.id

  const canOnboard = canOnboardNewPerson(session?.roleType.code, permissions)
  const canLink = canLinkExistingAccount(session?.roleType.code, permissions)

  // `?onboard=new` is a one-time intent, never a mode the URL pins open — strip it immediately
  // once handled (below) so closing the modal or navigating back can't re-trigger it.
  const hasOnboardParam = searchParams.get('onboard') === 'new'
  const shouldAutoOpen = hasOnboardParam && canOnboard
  const handleAutoOpenHandled = () => {
    searchParams.delete('onboard')
    setSearchParams(searchParams, { replace: true })
  }

  // An unauthorized session's CreateEmployeeModal never mounts or opens, so its own effect-driven
  // strip never fires — this page's own boundary must drop the param instead.
  useEffect(() => {
    if (hasOnboardParam && !canOnboard) handleAutoOpenHandled()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasOnboardParam, canOnboard])

  const { data, isLoading, error, refetch } = useEmployees({
    name: debouncedSearch || undefined,
    type: filters.type === 'ALL' ? undefined : (filters.type as EmployeeType),
    status: filters.status === 'ALL' ? undefined : (filters.status as EmployeeStatus),
    tenant: filters.tenant === 'ALL' ? undefined : filters.tenant,
    page: String(page),
    limit: String(PAGE_SIZE),
  })
  const employees = data?.data?.items ?? []
  const totalCount = data?.data?.count ?? 0

  const { data: tenantsData } = useTenants({}, isPlatformActor && canSearchTenants)
  const tenantOptions = isPlatformActor ? (tenantsData?.data?.items ?? []).map((t) => ({ id: t.id, label: t.name })) : undefined

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
            Employees
          </h1>
          <p className="text-[13px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>
            {!isLoading && !error ? `${totalCount} total` : 'Field officer HR records.'}
          </p>
        </div>
        {tenantId && foTypeId && (canOnboard || canLink) && (
          <CreateEmployeeModal
            tenantId={tenantId}
            foTypeId={foTypeId}
            canOnboardNewPerson={canOnboard}
            canLinkExistingAccount={canLink}
            autoOpenNewPerson={shouldAutoOpen}
            onAutoOpenHandled={handleAutoOpenHandled}
          />
        )}
      </div>

      <EmployeesFilterBar filters={filters} setFilter={handleFilterChange} reset={handleReset} tenantOptions={tenantOptions} />

      <QueryStateBlock isLoading={isLoading} error={error} loadingLabel="Loading employees…" errorLabel="Failed to load employees. Please try again." onRetry={refetch}>
        <EmployeesTable employees={employees} />
        <PaginationControls page={page} totalPages={totalPages(totalCount)} onPageChange={setPage} />
      </QueryStateBlock>
    </div>
  )
}

const EmployeesListPage = () => (
  <RequireEmployeeAccess>
    <EmployeesListContent />
  </RequireEmployeeAccess>
)

export default EmployeesListPage
