import type { UserStatus } from '@/types/user.types'

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
  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold ${STATUS_CLASSES[status]}`}>
    <span className="w-1.5 h-1.5 rounded-full bg-current" />
    {STATUS_LABEL[status]}
  </span>
)

export default StatusPill
