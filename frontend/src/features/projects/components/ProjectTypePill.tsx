import type { ProjectType } from '@/types/project.types'
import { PROJECT_TYPE_LABEL } from '@/types/project.types'
import { PROJECT_TYPE_COLOR } from '@/features/projects/projects.utils'

interface ProjectTypePillsProps {
  types: ProjectType[]
}

// `type` is a real backend array field (a project can be more than one type
// at once) — renders one pill per entry, replacing the old mock's
// single-select pill.
const ProjectTypePills = ({ types }: ProjectTypePillsProps) => (
  <div className="flex flex-wrap gap-1">
    {types.length === 0 && <span className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>—</span>}
    {types.map((type) => {
      const color = PROJECT_TYPE_COLOR[type] ?? '#94a3b8'
      return (
        <span
          key={type}
          className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold"
          style={{ background: `${color}18`, color }}
        >
          {PROJECT_TYPE_LABEL[type] ?? type}
        </span>
      )
    })}
  </div>
)

export default ProjectTypePills
