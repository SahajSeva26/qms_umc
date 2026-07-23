import type { GeoProfileStatus } from '@/types/geoProfile.types'

// Mirrors `@/features/access-management/role/components/RoleStatusPill.tsx` exactly.
const STATUS_CLASSES: Record<GeoProfileStatus, string> = {
  active: 'bg-success-soft text-success',
  inactive: 'bg-danger-soft text-danger',
}

const STATUS_LABEL: Record<GeoProfileStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
}

interface GeoProfileStatusPillProps {
  status?: GeoProfileStatus
}

const GeoProfileStatusPill = ({ status }: GeoProfileStatusPillProps) => {
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

export default GeoProfileStatusPill
