import type { RoleTypeStatus } from '@/types/accessManagement.types'
import StatusPill from '@/components/ui/StatusPill'

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

// `status` is only present server-side when the caller holds `tenant:admin`
// or `tenant:manage` (see RoleTypeEntity['status'] TODO in accessManagement.types.ts).
const RoleTypeStatusPill = ({ status }: RoleTypeStatusPillProps) => (
  <StatusPill status={status} classes={STATUS_CLASSES} labels={STATUS_LABEL} />
)

export default RoleTypeStatusPill
