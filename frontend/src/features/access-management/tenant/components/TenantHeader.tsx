import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { FiEdit2 } from 'react-icons/fi'
import { Button } from '@/components/ui/button'
import { useEntityImageUpload } from '@/components/widgets/upload/EntityImageUpload'
import { useTenantLogo, tenantLogoKeys } from '@/features/access-management/tenant/hooks/useTenantLogo'
import { useReplaceTenantLogo } from '@/features/access-management/tenant/hooks/useReplaceTenantLogo'
import { ACCEPTED_LOGO_MIME_TYPES, validateLogoFile } from '@/features/access-management/tenant/tenant.constants'
import { ROLE_ROUTES } from '@/features/access-management/role/role.routes'
import TenantTypeBadge from '@/features/access-management/tenant/components/TenantTypeBadge'
import TenantStatusPill from '@/features/access-management/tenant/components/TenantStatusPill'
import type { RolePopulatedUser, Tenant } from '@/types/accessManagement.types'

interface TenantHeaderProps {
  tenant: Tenant
  canManageTenant: boolean
  canViewRole: boolean
  ownerName: string | null
  ownerUser: RolePopulatedUser | null
  ownerEmailSuffix: string | null
  tenantAddress: string | null
  divisionPenetrationPct: number | null
  onEditClick: () => void
}

const TENANT_LOGO_COPY = {
  alt: 'Company logo',
  uploadLabel: 'Upload logo',
  changeLabel: 'Change logo',
  noun: 'logo',
  currentNoun: 'the current logo',
  oldNoun: 'old logo',
  newNoun: 'new logo',
  previousNoun: 'previous logo',
  linkConflictMessage: 'Another logo was just activated for this tenant.',
  restoreFailedMessage: "We couldn't restore the previous logo — a manual fix may be needed. Retrying won't necessarily fix this on its own.",
}

const TenantHeader = ({
  tenant,
  canManageTenant,
  canViewRole,
  ownerName,
  ownerUser,
  ownerEmailSuffix,
  tenantAddress,
  divisionPenetrationPct,
  onEditClick,
}: TenantHeaderProps) => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const logo = useTenantLogo(tenant.id)

  const invalidateLogo = () => {
    void queryClient.invalidateQueries({ queryKey: tenantLogoKeys.detail(tenant.id) })
  }

  const replaceLogo = useReplaceTenantLogo(tenant.id, logo.fileId, {
    onSuccess: invalidateLogo,
  })

  const { column: logoColumn, feedback: logoFeedback, hasLongFeedback, startOverDialog } = useEntityImageUpload({
    read: logo,
    replace: replaceLogo,
    size: 'lg',
    canManage: canManageTenant,
    copy: TENANT_LOGO_COPY,
    accept: ACCEPTED_LOGO_MIME_TYPES.join(','),
    validateFile: validateLogoFile,
  })

  return (
    <div
      className="rounded-xl border p-5 mb-5"
      style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 min-w-0">
          {logoColumn}

          <div className="min-w-0 max-w-[220px] sm:max-w-none text-center sm:text-left">
            <div className="text-lg font-bold truncate" style={{ color: 'var(--qms-text)' }}>
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

        <Button variant="outline" size="sm" className="shrink-0" onClick={onEditClick}>
          <FiEdit2 size={14} /> Edit client
        </Button>
      </div>

      {/* Row 2 — full card width, only rendered when there's genuinely long feedback content.
          A true sibling row, never nested in the w-32 column, so it can never force the first
          row wider. Independent of progressCaption — can render alongside an active caption. */}
      {hasLongFeedback && (
        <div className="mt-3 pt-3 border-t flex flex-col gap-2" style={{ borderColor: 'var(--qms-border)' }}>
          {logoFeedback}
        </div>
      )}

      {startOverDialog}
    </div>
  )
}

export default TenantHeader
