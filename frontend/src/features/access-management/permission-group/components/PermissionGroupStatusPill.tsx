import type { PermissionGroupStatus } from '@/types/accessManagement.types'

// Mirrors `@/features/access-management/tenant/components/TenantStatusPill.tsx` exactly,
// keyed on PermissionGroupStatus. `status` is only present server-side when
// the caller holds `system:manage` or `tenant:admin` (see
// PermissionGroupEntity['status'] TODO in accessManagement.types.ts), so this renders a
// neutral placeholder when it's missing.
const STATUS_CLASSES: Record<PermissionGroupStatus, string> = {
  active: 'bg-success-soft text-success',
  inactive: 'bg-danger-soft text-danger',
}

const STATUS_LABEL: Record<PermissionGroupStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
}

interface PermissionGroupStatusPillProps {
  status?: PermissionGroupStatus
}

const PermissionGroupStatusPill = ({ status }: PermissionGroupStatusPillProps) => {
  if (!status) {
    return (
      <span className="inline-flex items-center text-[11px] font-bold" style={{ color: 'var(--qms-text-muted)' }}>
        —
      </span>
    )
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold ${STATUS_CLASSES[status]}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {STATUS_LABEL[status]}
    </span>
  )
}

export default PermissionGroupStatusPill
