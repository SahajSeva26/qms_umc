import type { RoleStatus } from '@/types/accessManagement.types'

// Mirrors `@/features/access-management/role-type/components/RoleTypeStatusPill.tsx`
// exactly, keyed on RoleStatus. Unlike RoleType/PermissionGroup, RoleEntity's
// `status` field is NOT documented as gated behind an extra permission check
// in accessManagement.types.ts, but this still tolerates an undefined value defensively.
const STATUS_CLASSES: Record<RoleStatus, string> = {
  active: 'bg-success-soft text-success',
  inactive: 'bg-danger-soft text-danger',
}

const STATUS_LABEL: Record<RoleStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
}

interface RoleStatusPillProps {
  status?: RoleStatus
}

const RoleStatusPill = ({ status }: RoleStatusPillProps) => {
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

export default RoleStatusPill
