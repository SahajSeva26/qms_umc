import type { RoleStatus } from '@/types/accessManagement.types'
import StatusPill from '@/components/ui/StatusPill'

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

const RoleStatusPill = ({ status }: RoleStatusPillProps) => (
  <StatusPill status={status} classes={STATUS_CLASSES} labels={STATUS_LABEL} />
)

export default RoleStatusPill
