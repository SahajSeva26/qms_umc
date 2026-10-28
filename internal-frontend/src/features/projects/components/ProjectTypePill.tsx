import type { ProjectType } from '@/types/project.types'
import { PROJECT_TYPE_LABEL } from '@/types/project.types'
import { PROJECT_TYPE_COLOR } from '@/features/projects/projects.utils'

interface ProjectTypePillsProps {
  types: ProjectType[]
}

// `type` is a real backend array field (a project can be more than one type
// at once) — renders one pill per entry, replacing the old mock's
// single-select pill.
//
// Prototype's .mode-pill (projects-manager.js): 6px radius (not full pill), 2px/8px padding,
// 10px/700 text, and a real 1px border at ~18% color opacity — not just a tinted background.
const ProjectTypePills = ({ types }: ProjectTypePillsProps) => (
  <div className="flex flex-wrap gap-1">
    {types.length === 0 && <span className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>—</span>}
    {types.map((type, i) => {
      const color = PROJECT_TYPE_COLOR[type] ?? '#94a3b8'
      return (
        <span
          key={`${type}-${i}`}
          className="inline-flex items-center px-2 py-0.5 rounded-[6px] text-[10px] font-bold"
          style={{ background: `${color}1a`, color, border: `1px solid ${color}2e` }}
        >
          {PROJECT_TYPE_LABEL[type] ?? type}
        </span>
      )
    })}
  </div>
)

export default ProjectTypePills
