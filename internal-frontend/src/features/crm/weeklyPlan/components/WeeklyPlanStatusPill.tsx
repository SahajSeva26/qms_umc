import type { WeeklyPlanStatus } from '@/types/weeklyPlan.types'
import { WEEKLY_PLAN_STATUS_COLOR, WEEKLY_PLAN_STATUS_LABEL } from '@/types/weeklyPlan.types'
import ColorPill from '@/components/ui/ColorPill'

interface WeeklyPlanStatusPillProps {
  status: WeeklyPlanStatus
}

const WeeklyPlanStatusPill = ({ status }: WeeklyPlanStatusPillProps) => (
  <ColorPill
    status={status}
    colorMap={WEEKLY_PLAN_STATUS_COLOR}
    labelMap={WEEKLY_PLAN_STATUS_LABEL}
    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
  />
)

export default WeeklyPlanStatusPill
