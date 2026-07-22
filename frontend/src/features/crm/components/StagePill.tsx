import type { LeadStatus } from '@/types/crm.types'
import { LEAD_STATUS_LABEL, LEAD_STATUS_COLOR } from '@/types/crm.types'

interface StagePillProps {
  status: LeadStatus
}

const StagePill = ({ status }: StagePillProps) => {
  const color = LEAD_STATUS_COLOR[status]

  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
      style={{ background: `${color}22`, color }}
    >
      {LEAD_STATUS_LABEL[status]}
    </span>
  )
}

export default StagePill
