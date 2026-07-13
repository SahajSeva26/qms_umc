import { CAMP_STATUSES } from '@/features/camps/camps.mock'
import type { CampStatus } from '@/types/camp.types'

interface CampStatusPillProps {
  status: CampStatus
}

const CampStatusPill = ({ status }: CampStatusPillProps) => {
  const meta = CAMP_STATUSES.find((s) => s.id === status)
  const color = meta?.color ?? '#94a3b8'

  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
      style={{ background: `${color}22`, color }}
    >
      {meta?.name ?? status}
    </span>
  )
}

export default CampStatusPill
