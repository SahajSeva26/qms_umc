import type { ProjectStatus } from '@/types/project.types'
import { PROJECT_STATUS_COLOR, PROJECT_STATUS_LABEL } from '@/types/project.types'
import ColorPill from '@/components/ui/ColorPill'

interface ProjectStatusPillProps {
  status: ProjectStatus
  onClick?: () => void
}

const ProjectStatusPill = ({ status, onClick }: ProjectStatusPillProps) => (
  <ColorPill
    status={status}
    colorMap={PROJECT_STATUS_COLOR}
    labelMap={PROJECT_STATUS_LABEL}
    onClick={onClick}
    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
  />
)

export default ProjectStatusPill
