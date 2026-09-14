import StatusPill from '@/components/ui/StatusPill'

type FoAvailability = 'available' | 'unavailable'

const CLASSES: Record<FoAvailability, string> = {
  available: 'bg-success-soft text-success',
  unavailable: 'bg-danger-soft text-danger',
}

const LABELS: Record<FoAvailability, string> = {
  available: 'Available',
  unavailable: 'Unavailable',
}

interface FoAvailabilityPillProps {
  available: boolean
}

const FoAvailabilityPill = ({ available }: FoAvailabilityPillProps) => (
  <StatusPill status={available ? 'available' : 'unavailable'} classes={CLASSES} labels={LABELS} />
)

export default FoAvailabilityPill
