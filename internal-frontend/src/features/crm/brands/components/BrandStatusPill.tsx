import type { BrandStatus } from '@/types/brand.types'
import StatusPill from '@/components/ui/StatusPill'

const STATUS_CLASSES: Record<BrandStatus, string> = {
  active: 'bg-success-soft text-success',
  inactive: 'bg-danger-soft text-danger',
}

const STATUS_LABEL: Record<BrandStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
}

interface BrandStatusPillProps {
  status?: BrandStatus
}

const BrandStatusPill = ({ status }: BrandStatusPillProps) => (
  <StatusPill status={status} classes={STATUS_CLASSES} labels={STATUS_LABEL} />
)

export default BrandStatusPill
