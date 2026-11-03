import type { ReactNode } from 'react'
import { usePermission } from '@/hooks/usePermission'
import WeeklyPlanMyPlanCard from '@/features/crm/weeklyPlan/components/WeeklyPlanMyPlanCard'
import WeeklyPlanApprovalQueueCard from '@/features/crm/weeklyPlan/components/WeeklyPlanApprovalQueueCard'

interface WeeklyPlanPanelProps {
  /** Extra cards (e.g. appointments' TomorrowMeetingsCard) rendered first, in the same grid row. */
  children?: ReactNode
}

// Mounted above the Appointments calendar toolbar. Only sales-rep/sales-head role types hold
// any weekly-plan permission — if neither check passes, nothing renders (children included).
const WeeklyPlanPanel = ({ children }: WeeklyPlanPanelProps) => {
  const { hasAnyPermission } = usePermission()
  const canManage = hasAnyPermission(['weekly-plan:manage', 'tenant:manage'])
  const canParticipate = canManage || hasAnyPermission(['weekly-plan:search', 'weekly-plan:create', 'weekly-plan:update', 'weekly-plan:get'])

  if (!canParticipate) return null

  // Matches the prototype's .wk-wrap (sales-weekly-plan.js) — auto-fit grid, min 320px per card.
  return (
    <div className="mb-4 grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
      {children}
      {canManage ? <WeeklyPlanApprovalQueueCard /> : <WeeklyPlanMyPlanCard />}
    </div>
  )
}

export default WeeklyPlanPanel
