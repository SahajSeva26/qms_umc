import { PROJECT_TYPES } from '@/types/project.types'
import type { ProjectType } from '@/types/project.types'

interface ProjectTypePillProps {
  type: ProjectType
}

const ProjectTypePill = ({ type }: ProjectTypePillProps) => {
  const meta = PROJECT_TYPES.find((t) => t.id === type)
  const color = meta?.color ?? '#94a3b8'

  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold"
      style={{ background: `${color}18`, color }}
    >
      {meta?.label ?? type}
    </span>
  )
}

export default ProjectTypePill
