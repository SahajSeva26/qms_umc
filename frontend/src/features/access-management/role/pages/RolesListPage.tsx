import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiPlus } from 'react-icons/fi'
import { useRoles } from '@/features/access-management/role/hooks/useRoles'
import { useRolesFilters } from '@/features/access-management/role/hooks/useRolesFilters'
import { useTenants } from '@/features/access-management/tenant/hooks/useTenants'
import RolesTable from '@/features/access-management/role/components/RolesTable'
import RolesFilterBar from '@/features/access-management/role/components/RolesFilterBar'
import PaginationControls from '@/components/ui/PaginationControls'
import { ROLE_ROUTES } from '@/features/access-management/role/role.routes'
import { Button } from '@/components/ui/button'
import type { RoleStatus } from '@/types/accessManagement.types'

const PAGE_SIZE = 10

// Shows every role across every tenant by default (no forced tenant picker
// before the table renders — GET /roles has no hardcoded status default,
// and search() applies ctx.where() scoping on its own, so an unfiltered call
// already returns everything the caller is allowed to see). Status/Tenant/
// Search narrow the results from there, with real server-side pagination
// since all three filters are genuinely applied in the backend's
// where-clause (mirrors RoleTypesListPage.tsx exactly).
const RolesListPage = () => {
  const navigate = useNavigate()
  const { filters, setFilter, reset } = useRolesFilters()
  const [page, setPage] = useState(1)

  const { data, isLoading, error } = useRoles({
    name: filters.search || undefined,
    status: filters.status === 'ALL' ? undefined : (filters.status as RoleStatus),
    tenant: filters.tenant === 'ALL' ? undefined : filters.tenant,
    page: String(page),
    limit: String(PAGE_SIZE),
  })
  const roles = data?.data?.items ?? []
  const totalCount = data?.data?.count ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  const { data: tenantsData } = useTenants({})
  const tenantOptions = (tenantsData?.data?.items ?? []).map((t) => ({ id: t.id, label: t.name }))

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
            Roles
          </h1>
          <p className="text-[13px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>
            {!isLoading && !error ? `${totalCount} total` : 'Manage roles across tenants.'}
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

      {isLoading && (
        <div className="text-[13px] py-10 text-center" style={{ color: 'var(--qms-text-muted)' }}>
          Loading roles…
        </div>
      )}

      {error && !isLoading && (
        <div className="text-[13px] rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">
          Failed to load roles. Please try again.
        </div>
      )}

      {!isLoading && !error && (
        <>
          <RolesTable roles={roles} />
          <PaginationControls page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  )
}

export default RolesListPage
