import type { PermissionGroupStatus } from '@/types/accessManagement.types'
import StatusPill from '@/components/ui/StatusPill'

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

// `status` is only present server-side when the caller holds `system:manage`
// or `tenant:admin` (see PermissionGroupEntity['status'] TODO in accessManagement.types.ts).
const PermissionGroupStatusPill = ({ status }: PermissionGroupStatusPillProps) => (
  <StatusPill status={status} classes={STATUS_CLASSES} labels={STATUS_LABEL} />
)

export default PermissionGroupStatusPill
