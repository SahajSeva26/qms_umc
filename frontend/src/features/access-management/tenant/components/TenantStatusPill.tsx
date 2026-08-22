import type { TenantStatus } from '@/features/access-management/accessManagement.types'
import StatusPill from '@/components/ui/StatusPill'

const STATUS_CLASSES: Record<TenantStatus, string> = {
  active: 'bg-success-soft text-success',
  inactive: 'bg-danger-soft text-danger',
}

const STATUS_LABEL: Record<TenantStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
}

interface TenantStatusPillProps {
  status?: TenantStatus
}

const TenantStatusPill = ({ status }: TenantStatusPillProps) => (
  <StatusPill status={status} classes={STATUS_CLASSES} labels={STATUS_LABEL} />
)

export default TenantStatusPill
