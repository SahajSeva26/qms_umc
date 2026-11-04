import { useNavigate } from 'react-router-dom'
import { FiEdit2 } from 'react-icons/fi'
import { Button } from '@/components/ui/button'
import { useTenantLogoField } from '@/features/access-management/tenant/hooks/useTenantLogoField'
import { ROLE_ROUTES } from '@/features/access-management/role/role.routes'
import TenantTypeBadge from '@/features/access-management/tenant/components/TenantTypeBadge'
import TenantStatusPill from '@/features/access-management/tenant/components/TenantStatusPill'
import type { RolePopulatedUser, Tenant } from '@/types/accessManagement.types'

interface TenantHeaderProps {
  tenant: Tenant
  canManageTenant: boolean
  // salesPerson is system:manage-gated server-side (same as owner) — shown only when true, matching
  // EditTenantModal's own gate for editing it.
  canManageSystem: boolean
  canViewRole: boolean
  ownerName: string | null
  ownerUser: RolePopulatedUser | null
  ownerEmailSuffix: string | null
  salesPersonName: string | null
  tenantAddress: string | null
  divisionPenetrationPct: number | null
  onEditClick: () => void
}

const TenantHeader = ({
  tenant,
  canManageTenant,
  canManageSystem,
  canViewRole,
  ownerName,
  ownerUser,
  ownerEmailSuffix,
  salesPersonName,
  tenantAddress,
  divisionPenetrationPct,
  onEditClick,
}: TenantHeaderProps) => {
  const navigate = useNavigate()
  const { column: logoColumn, feedback: logoFeedback, hasLongFeedback } = useTenantLogoField({
    tenantId: tenant.id,
    canManage: canManageTenant,
  })

  return (
    <div className="mb-5">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 min-w-0">
          {logoColumn}

          <div className="min-w-0 max-w-[220px] sm:max-w-none text-center sm:text-left">
            {/* Prototype's .cm-pagehdr h2/.ph-sub — 19px/800 name, 12px muted subtitle, no card chrome. */}
            <div className="text-[19px] font-extrabold truncate" style={{ color: 'var(--qms-text)' }}>
              {tenant.name}
            </div>
            <div className="text-[13px] truncate mb-2" style={{ color: 'var(--qms-text-muted)' }}>
              {tenant.code}
            </div>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <TenantTypeBadge type={tenant.type} />
              <TenantStatusPill status={tenant.status} />
            </div>
            {tenant.owner && (
              <div className="text-[11px] mt-3 wrap-break-word" style={{ color: 'var(--qms-text-muted)' }}>
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
            {canManageSystem && tenant.salesPerson && (
              <div className="text-[11px] mt-1.5 wrap-break-word" style={{ color: 'var(--qms-text-muted)' }}>
                Sales rep:{' '}
                <span className="font-semibold" style={{ color: 'var(--qms-text-soft)' }}>
                  {salesPersonName ?? tenant.salesPerson}
                </span>
              </div>
            )}
            {tenantAddress && (
              <div className="text-[11px] mt-1.5 wrap-break-word" style={{ color: 'var(--qms-text-muted)' }}>
                Address: <span className="font-semibold" style={{ color: 'var(--qms-text-soft)' }}>{tenantAddress}</span>
              </div>
            )}
            {tenant.businessLifetime != null && (
              <div className="text-[11px] mt-1.5" style={{ color: 'var(--qms-text-muted)' }}>
                Business lifetime: <span className="font-semibold" style={{ color: 'var(--qms-text-soft)' }}>{tenant.businessLifetime} year{tenant.businessLifetime === 1 ? '' : 's'}</span>
              </div>
            )}
            {tenant.gst && (
              <div className="text-[11px] mt-1.5 wrap-break-word" style={{ color: 'var(--qms-text-muted)' }}>
                GST: <span className="font-semibold" style={{ color: 'var(--qms-text-soft)' }}>{tenant.gst}</span>
              </div>
            )}
            {divisionPenetrationPct !== null && (
              <div className="text-[11px] mt-1.5" style={{ color: 'var(--qms-text-muted)' }}>
                Division Penetration: <span className="font-semibold" style={{ color: 'var(--qms-text-soft)' }}>{divisionPenetrationPct}%</span>
              </div>
            )}
          </div>
        </div>

        {canManageTenant && (
          <Button variant="outline" size="sm" className="shrink-0" onClick={onEditClick}>
            <FiEdit2 size={14} /> Edit client
          </Button>
        )}
      </div>

      {/* Row 2 — only rendered when there's genuinely long feedback content. A true sibling
          row, never nested in the w-32 column, so it can never force the first row wider. */}
      {hasLongFeedback && (
        <div className="mt-3 pt-3 border-t flex flex-col gap-2" style={{ borderColor: 'var(--qms-border)' }}>
          {logoFeedback}
        </div>
      )}
    </div>
  )
}

export default TenantHeader
