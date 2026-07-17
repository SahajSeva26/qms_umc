import type { Camp } from '@/types/camp.types'
import type { Project } from '@/types/project.types'
import { campsProgressPct, executedCamps, renewalConsumedPct, totalPoCamps } from '@/features/projects/projects.utils'

interface ProjectCampsCellProps {
  project: Project
  camps: Camp[]
}

const ProjectCampsCell = ({ project, camps }: ProjectCampsCellProps) => {
  const total = totalPoCamps(project)
  const done = executedCamps(project, camps)
  const pct = campsProgressPct(project, camps)
  const consumedPct = renewalConsumedPct(project)
  const quotaUsed = total > 0 && done >= total
  const renewalDue = !quotaUsed && consumedPct >= project.renewalReminderPct

  return (
    <div className="min-w-32">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--qms-surface-strong)' }}>
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, var(--qms-brand), var(--qms-teal))' }} />
        </div>
        <span className="text-[12px] font-semibold tabular-nums shrink-0" style={{ color: 'var(--qms-text)' }}>{done}/{total}</span>
      </div>
      {quotaUsed && (
        <div className="text-[10px] font-semibold mt-1 text-danger">PO quota used</div>
      )}
      {renewalDue && (
        <div className="text-[10px] font-semibold mt-1" style={{ color: 'var(--warning)' }}>⚠ {consumedPct}% billable consumed — renewal due</div>
      )}
    </div>
  )
}

export default ProjectCampsCell
