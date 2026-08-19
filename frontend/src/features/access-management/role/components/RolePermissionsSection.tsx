import type { ReactNode } from 'react'
import PermissionCheckboxRow from '@/components/ui/PermissionCheckboxRow'
import type { useRolePermissionPicker } from '@/features/access-management/role/hooks/useRolePermissionPicker'

interface RolePermissionsSectionProps {
  tenant: string
  roleType: string
  picker: ReturnType<typeof useRolePermissionPicker>
  validationBanners?: ReactNode
  children?: ReactNode
}

const RolePermissionsSection = ({ tenant, roleType, picker, validationBanners, children }: RolePermissionsSectionProps) => {
  const { permissionGroup, isLoadingCeiling, permissionGroupCeilingCodes, candidatePermissions, effectiveSelectedCodes, toggleCode } = picker

  return (
    <div className="rounded-xl border p-5" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}>
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-bold" style={{ color: 'var(--qms-text)' }}>
          Elevated permissions
        </h2>
        <span className="text-[11px] font-semibold" style={{ color: 'var(--qms-text-muted)' }}>
          {effectiveSelectedCodes.size} of {candidatePermissions.length} selected
        </span>
      </div>
      <p className="text-[12px] mb-4" style={{ color: 'var(--qms-text-muted)' }}>
        Optional, temporary grants layered on top of the bound role type's own permissions (e.g. a same-domain
        grant like <span className="font-mono">sales.manage</span> for this one person) — not a replacement for
        them. Choices are limited to permissions the role type already has AND that this company's permission
        group allows.{' '}
        <span className="font-semibold">
          Admin Company, Manage Company, and system-manage can never be granted here.
        </span>
      </p>

      {!tenant && (
        <div className="text-[13px] py-6 text-center rounded-lg border" style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}>
          Select a company above to load available elevated permissions.
        </div>
      )}

      {tenant && !roleType && (
        <div className="text-[13px] py-6 text-center rounded-lg border" style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}>
          Select a role type above to see what can be elevated on top of it.
        </div>
      )}

      {tenant && roleType && isLoadingCeiling && (
        <div className="text-[13px] py-6 text-center" style={{ color: 'var(--qms-text-muted)' }}>
          Loading available permissions…
        </div>
      )}

      {tenant && roleType && !isLoadingCeiling && !permissionGroup && (
        <div className="text-[13px] rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">
          This company has no permission group configured yet, so no elevated permissions can be assigned.
        </div>
      )}

      {tenant && roleType && !isLoadingCeiling && permissionGroup && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {candidatePermissions.map((permission) => (
            <PermissionCheckboxRow
              key={permission.code}
              permission={permission}
              checked={effectiveSelectedCodes.has(permission.code)}
              onToggle={toggleCode}
            />
          ))}

          {candidatePermissions.length === 0 && (
            <div className="text-[13px] py-6 text-center col-span-full" style={{ color: 'var(--qms-text-muted)' }}>
              No permissions are available to elevate — either the role type has none, or none of them are
              within this company's permission group ceiling.
            </div>
          )}
        </div>
      )}

      {permissionGroupCeilingCodes.size === 0 && permissionGroup && (
        <p className="text-[11px] mt-3" style={{ color: 'var(--qms-text-muted)' }}>
          This company's permission group currently grants no permissions.
        </p>
      )}

      {validationBanners}
      {children}
    </div>
  )
}

export default RolePermissionsSection
