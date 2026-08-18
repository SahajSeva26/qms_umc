import type { UserStatus } from '@/types/user.types'
import SharedStatusPill from '@/components/ui/StatusPill'

const STATUS_CLASSES: Record<UserStatus, string> = {
  active:    'bg-success-soft text-success',
  inactive:  'bg-warning-soft text-warning',
  suspended: 'bg-danger-soft text-danger',
  deleted:   'bg-danger-soft text-danger',
}

const STATUS_LABEL: Record<UserStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  suspended: 'Suspended',
  deleted: 'Deleted',
}

interface StatusPillProps {
  status: UserStatus
}

const StatusPill = ({ status }: StatusPillProps) => (
  <SharedStatusPill status={status} classes={STATUS_CLASSES} labels={STATUS_LABEL} />
)

export default StatusPill
