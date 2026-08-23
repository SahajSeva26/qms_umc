import type { DoctorStatus } from '@/features/doctors/doctor.types'
import SharedStatusPill from '@/components/ui/StatusPill'

const STATUS_CLASSES: Record<DoctorStatus, string> = {
  active: 'bg-success-soft text-success',
  inactive: 'bg-danger-soft text-danger',
}

const STATUS_LABEL: Record<DoctorStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
}

interface StatusPillProps {
  status?: DoctorStatus
}

// `status` is only present when the caller holds `doctor:manage`
// (DoctorMapper's own gate).
const StatusPill = ({ status }: StatusPillProps) => (
  <SharedStatusPill status={status} classes={STATUS_CLASSES} labels={STATUS_LABEL} />
)

export default StatusPill
