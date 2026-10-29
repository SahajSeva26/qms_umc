import type { DoctorStatus } from '@/types/doctor.types'

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

// `status` is only present when the caller holds `doctor:manage` (the backend mapper's own gate)
// — undefined (not a specific status) means "can't tell," not "inactive."
const StatusPill = ({ status }: StatusPillProps) => {
  if (!status) {
    return (
      <span className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' }}>
        —
      </span>
    )
  }
  return (
    <span className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_CLASSES[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  )
}

export default StatusPill
