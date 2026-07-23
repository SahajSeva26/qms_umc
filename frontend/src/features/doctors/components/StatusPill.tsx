import type { DoctorStatus } from '@/types/doctor.types'

// Mirrors `@/features/access-management/role/components/RoleStatusPill.tsx`
// exactly. `status` is only present when the caller holds `doctor:manage`
// (DoctorMapper's own gate) — tolerates undefined defensively.
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

const StatusPill = ({ status }: StatusPillProps) => {
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

export default StatusPill
