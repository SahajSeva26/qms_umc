import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FiArrowLeft, FiEdit2, FiPlus } from 'react-icons/fi'
import { useTenant } from '@/features/access-management/tenant/hooks/useTenant'
import { useRole } from '@/features/access-management/role/hooks/useRole'
import { ROLE_ROUTES } from '@/features/access-management/role/role.routes'
import { useDivisions } from '@/features/crm/divisions/hooks/useDivisions'
import { useDivisionsFilters } from '@/features/crm/divisions/hooks/useDivisionsFilters'
import DivisionsFilterBar from '@/features/crm/divisions/components/DivisionsFilterBar'
import DivisionsTable from '@/features/crm/divisions/components/DivisionsTable'
import CreateDivisionModal from '@/features/crm/divisions/components/CreateDivisionModal'
import EditTenantModal from '@/features/access-management/tenant/components/EditTenantModal'
import EditContactModal from '@/features/contacts/components/EditContactModal'
import { DIVISION_ROUTES } from '@/features/crm/divisions/divisions.routes'
import { usePermission } from '@/hooks/usePermission'
import { TENANT_ROUTES } from '@/features/access-management/tenant/tenant.routes'
import TenantTypeBadge from '@/features/access-management/tenant/components/TenantTypeBadge'
import TenantStatusPill from '@/features/access-management/tenant/components/TenantStatusPill'
import { Button } from '@/components/ui/button'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import type { DivisionEntity } from '@/features/crm/crm.types'
import type { RolePopulatedUser } from '@/features/access-management/accessManagement.types'

const TenantDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data, isLoading, error } = useTenant(id)
  const tenant = data?.data ?? null

  const { hasPermission, hasAnyPermission } = usePermission()
  const canManageTenant = hasPermission('tenant:manage')
  const canManageSystem = hasPermission('system:manage')
  const canViewRole = hasAnyPermission(['role:get', 'role:search', 'role:manage'])
  const canViewDivisions = hasAnyPermission(['division:manage', 'tenant:admin', 'lead:manage'])
  const canSeeInactiveDivisions = hasAnyPermission(['division:manage', 'tenant:manage'])
  const canManageContacts = hasAnyPermission(['contact:manage', 'tenant:manage', 'tenant:admin'])

  const { data: ownerRoleData } = useRole(tenant?.owner)
  const ownerRole = ownerRoleData?.data ?? null
  const ownerUser = ownerRole && typeof ownerRole.user !== 'string' ? (ownerRole.user as RolePopulatedUser) : null
  const ownerName = ownerUser?.firstName ? `${ownerUser.firstName} ${ownerUser.lastName ?? ''}`.trim() : null
  const ownerEmailSuffix = ownerName && ownerUser?.email ? ownerUser.email : null

  const [editOpen, setEditOpen] = useState(false)
  const [createDivisionOpen, setCreateDivisionOpen] = useState(false)
  const [addContactOpen, setAddContactOpen] = useState(false)

  const { filters, setFilter, reset } = useDivisionsFilters()
  const debouncedSearch = useDebouncedValue(filters.search, 300)
  const debouncedCode = useDebouncedValue(filters.code, 300)

  const { data: divisionsData, isLoading: divisionsLoading, error: divisionsError } = useDivisions(
    {
      tenant: tenant?.id,
      name: filters.searchBy === 'name' ? debouncedSearch || undefined : undefined,
      code: filters.searchBy === 'code' ? debouncedCode || undefined : undefined,
      therapy: filters.therapy === 'ALL' ? undefined : filters.therapy,
      status: filters.status,
      limit: '10',
    },
    canViewDivisions && !!tenant?.id,
  )
  const divisions = divisionsData?.data?.items ?? []
  const totalDivisions = divisionsData?.data?.count ?? 0

  return (
    <div className="w-full">
      <button
        onClick={() => navigate(TENANT_ROUTES.TENANTS)}
        className="flex items-center gap-1.5 text-[13px] font-semibold mb-5 transition-colors hover:opacity-80"
        style={{ color: 'var(--qms-text-soft)' }}
      >
        <FiArrowLeft size={14} />
        Back to Client Management
      </button>

      {isLoading && (
        <div className="text-[13px] py-10 text-center" style={{ color: 'var(--qms-text-muted)' }}>
          Loading company…
        </div>
      )}

      {error && !isLoading && (
        <div className="text-[13px] rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">
          Failed to load company. Please try again.
        </div>
      )}

      {tenant && !isLoading && (
        <>
          <div
            className="rounded-xl border p-5 mb-5 flex items-start justify-between gap-3"
            style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}
          >
            <div className="min-w-0">
              <div className="text-lg font-bold truncate" style={{ color: 'var(--qms-text)' }}>
                {tenant.name}
              </div>
              <div className="text-[13px] truncate mb-2" style={{ color: 'var(--qms-text-muted)' }}>
                {tenant.code}
              </div>
              <div className="flex items-center gap-2">
                <TenantTypeBadge type={tenant.type} />
                <TenantStatusPill status={tenant.status} />
              </div>
              {tenant.owner && (
                <div className="text-[11px] mt-3" style={{ color: 'var(--qms-text-muted)' }}>
                  Owner:{' '}
                  {canViewRole ? (
                    <button
                      onClick={() => navigate(ROLE_ROUTES.ROLE_DETAIL.replace(':id', tenant.owner as string))}
                      className="font-semibold underline underline-offset-2 hover:opacity-80"
                      style={{ color: 'var(--qms-text-soft)' }}
                    >
                      {ownerName ?? (ownerUser?.email ?? tenant.owner)}
                    </button>
                  ) : (
                    <span className="font-semibold" style={{ color: 'var(--qms-text-soft)' }}>
                      {ownerName ?? tenant.owner}
                    </span>
                  )}
                  {ownerEmailSuffix && <span className="ml-1.5">({ownerEmailSuffix})</span>}
                </div>
              )}
            </div>

            <Button variant="outline" size="sm" className="shrink-0" onClick={() => setEditOpen(true)}>
              <FiEdit2 size={14} /> Edit client
            </Button>
          </div>

          {canViewDivisions && (
            <div>
              <div className="mb-3 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold" style={{ color: 'var(--qms-text)' }}>Divisions</h2>
                  <p className="text-[12px] mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>
                    {!divisionsLoading && !divisionsError ? `${totalDivisions} total` : 'Divisions under this company.'}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {canManageContacts && (
                    <Button
                      onClick={() => setAddContactOpen(true)}
                      className="text-white"
                      style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
                    >
                      <FiPlus size={14} /> New Contact
                    </Button>
                  )}
                  <Button
                    onClick={() => setCreateDivisionOpen(true)}
                    className="text-white"
                    style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
                  >
                    <FiPlus size={14} /> New Division
                  </Button>
                </div>
              </div>

              <DivisionsFilterBar filters={filters} setFilter={setFilter} reset={reset} canSeeInactive={canSeeInactiveDivisions} />

              {divisionsLoading && (
                <div className="text-[13px] py-10 text-center" style={{ color: 'var(--qms-text-muted)' }}>
                  Loading divisions…
                </div>
              )}

              {divisionsError && !divisionsLoading && (
                <div className="text-[13px] rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">
                  Failed to load divisions. Please try again.
                </div>
              )}

              {!divisionsLoading && !divisionsError && (
                <DivisionsTable
                  divisions={divisions}
                  onRowClick={(division: DivisionEntity) => navigate(DIVISION_ROUTES.DIVISION_DETAIL.replace(':id', division.id))}
                />
              )}
            </div>
          )}

          {editOpen && (
            <EditTenantModal
              tenant={tenant}
              canManageTenant={canManageTenant}
              canManageSystem={canManageSystem}
              onClose={() => setEditOpen(false)}
            />
          )}

          {createDivisionOpen && (
            <CreateDivisionModal onClose={() => setCreateDivisionOpen(false)} defaultTenantId={tenant.id} />
          )}

          <EditContactModal
            open={addContactOpen}
            contact={null}
            onClose={() => setAddContactOpen(false)}
            fixedTenantId={tenant.id}
            fixedTenantType={tenant.type}
          />
        </>
      )}
    </div>
  )
}

export default TenantDetailPage
