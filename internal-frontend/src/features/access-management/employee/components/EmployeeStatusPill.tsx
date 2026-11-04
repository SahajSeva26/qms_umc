import type { EmployeeStatus } from '@/types/accessManagement.types'
import StatusPill from '@/components/ui/StatusPill'

const STATUS_CLASSES: Record<EmployeeStatus, string> = {
  active: 'bg-success-soft text-success',
  inactive: 'bg-warning-soft text-warning',
  terminated: 'bg-danger-soft text-danger',
}

const STATUS_LABEL: Record<EmployeeStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  terminated: 'Terminated',
}

interface EmployeeStatusPillProps {
  status?: EmployeeStatus
}

const EmployeeStatusPill = ({ status }: EmployeeStatusPillProps) => (
  <StatusPill status={status} classes={STATUS_CLASSES} labels={STATUS_LABEL} />
)

export default EmployeeStatusPill
