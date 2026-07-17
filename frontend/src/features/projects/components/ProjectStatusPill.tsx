import { PROJECT_STATUSES } from '@/types/project.types'
import type { ProjectStatus } from '@/types/project.types'

interface ProjectStatusPillProps {
  status: ProjectStatus
  onClick?: () => void
}

const ProjectStatusPill = ({ status, onClick }: ProjectStatusPillProps) => {
  const meta = PROJECT_STATUSES.find((s) => s.id === status)
  const color = meta?.color ?? '#94a3b8'

  return (
    <span
      onClick={onClick}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
      style={{ background: `${color}22`, color, cursor: onClick ? 'pointer' : undefined }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      {meta?.label ?? status}
    </span>
  )
}

export default ProjectStatusPill
