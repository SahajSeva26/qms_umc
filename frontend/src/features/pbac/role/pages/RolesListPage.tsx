import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiPlus, FiSearch } from 'react-icons/fi'
import { useRoles } from '@/features/pbac/role/hooks/useRoles'
import { useTenants } from '@/features/pbac/tenant/hooks/useTenants'
import RolesTable from '@/features/pbac/role/components/RolesTable'
import { ROLE_ROUTES } from '@/features/pbac/role/role.routes'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

// Mirrors `@/features/pbac/role-type/pages/RoleTypesListPage.tsx` exactly:
// local search state feeds the search query, loading/error/empty states
// rendered inline, hand-built table below. Roles are tenant-scoped
// (SearchRoleQuery.tenant) just like RoleTypes, so this page adds the same
// tenant picker: an optional `tenantId` prop for a caller that already knows
// which tenant it wants, otherwise a self-rendered <Select> populated from
// `useTenants`. The roles query itself is only run once a tenant is selected.

interface RolesListPageProps {
  /** Optional pre-selected tenant id. When omitted, the page renders its own tenant picker. */
  tenantId?: string
}

const RolesListPage = ({ tenantId }: RolesListPageProps) => {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [selectedTenant, setSelectedTenant] = useState(tenantId ?? '')

  const { data: tenantsData } = useTenants({})
  const tenants = tenantsData?.data?.items ?? []

  const { data, isLoading, error } = useRoles({
    tenant: selectedTenant || undefined,
    name: search || undefined,
  })
  const roles = data?.data?.items ?? []

  return (
    <div className="max-w-5xl">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--qms-text)' }}>
            Roles
          </h1>
          <p className="text-[13px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>
            {selectedTenant && data?.data
              ? `${data.data.count} total`
              : 'Select a tenant to manage its roles.'}
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

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Select value={selectedTenant || undefined} onValueChange={(v) => setSelectedTenant(v ?? '')}>
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue placeholder="Select tenant" />
          </SelectTrigger>
          <SelectContent>
            {tenants.map((tenant) => (
              <SelectItem key={tenant.id} value={tenant.id}>
                {tenant.name} ({tenant.code})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative max-w-sm flex-1 min-w-50">
          <FiSearch
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--qms-text-muted)' }}
          />
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name..."
            className="pl-9 text-[13px] md:text-[13px]"
          />
        </div>
      </div>

      {!selectedTenant && (
        <div className="text-[13px] py-10 text-center rounded-xl border" style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}>
          Choose a tenant above to view its roles.
        </div>
      )}

      {selectedTenant && isLoading && (
        <div className="text-[13px] py-10 text-center" style={{ color: 'var(--qms-text-muted)' }}>
          Loading roles…
        </div>
      )}

      {selectedTenant && error && !isLoading && (
        <div className="text-[13px] rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">
          Failed to load roles. Please try again.
        </div>
      )}

      {selectedTenant && !isLoading && !error && <RolesTable roles={roles} />}
    </div>
  )
}

export default RolesListPage
