import type { LeadStatus } from '@/types/crm.types'
import { LEAD_STATUS_LABEL, LEAD_STATUS_COLOR } from '@/types/crm.types'
import ColorPill from '@/components/ui/ColorPill'

interface StagePillProps {
  status: LeadStatus
}

const StagePill = ({ status }: StagePillProps) => (
  <ColorPill
    status={status}
    colorMap={LEAD_STATUS_COLOR}
    labelMap={LEAD_STATUS_LABEL}
    showDot={false}
    className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
  />
)

export default StagePill
