import type { RoleTypeStatus } from '@/types/accessManagement.types'

// Mirrors `@/features/access-management/permission-group/components/PermissionGroupStatusPill.tsx`
// exactly, keyed on RoleTypeStatus. `status` is only present server-side when
// the caller holds `tenant:admin` or `tenant:manage` (see
// RoleTypeEntity['status'] TODO in accessManagement.types.ts), so this renders a neutral
// placeholder when it's missing.
const STATUS_CLASSES: Record<RoleTypeStatus, string> = {
  active: 'bg-success-soft text-success',
  inactive: 'bg-danger-soft text-danger',
}

const STATUS_LABEL: Record<RoleTypeStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
}

interface RoleTypeStatusPillProps {
  status?: RoleTypeStatus
}

const RoleTypeStatusPill = ({ status }: RoleTypeStatusPillProps) => {
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

export default RoleTypeStatusPill
