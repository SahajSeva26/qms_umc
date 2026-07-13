import type { LeadStage } from '@/types/lead.types'
import { STAGES, LOST_STAGE } from '@/features/crm/crm.mock'

interface StagePillProps {
  stage: LeadStage
}

const StagePill = ({ stage }: StagePillProps) => {
  const meta = stage === 'lost' ? LOST_STAGE : STAGES.find((s) => s.id === stage)
  const color = meta?.color ?? '#94a3b8'

  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
      style={{ background: `${color}22`, color }}
    >
      {meta?.name ?? stage}
    </span>
  )
}

export default StagePill
