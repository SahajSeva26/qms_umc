import type { GeoProfileStatus } from '@/features/geo-profile/geoProfile.types'
import { GEO_PROFILE_STATUS_LABEL } from '@/features/geo-profile/geoProfile.constants'
import StatusPill from '@/components/ui/StatusPill'

const STATUS_CLASSES: Record<GeoProfileStatus, string> = {
  active: 'bg-success-soft text-success',
  inactive: 'bg-danger-soft text-danger',
}

interface GeoProfileStatusPillProps {
  status?: GeoProfileStatus
}

const GeoProfileStatusPill = ({ status }: GeoProfileStatusPillProps) => (
  <StatusPill status={status} classes={STATUS_CLASSES} labels={GEO_PROFILE_STATUS_LABEL} />
)

export default GeoProfileStatusPill
