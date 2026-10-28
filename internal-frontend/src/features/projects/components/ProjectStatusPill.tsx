import type { ProjectStatus } from '@/types/project.types'
import { PROJECT_STATUS_COLOR, PROJECT_STATUS_LABEL } from '@/types/project.types'
import ColorPill from '@/components/ui/ColorPill'

interface ProjectStatusPillProps {
  status: ProjectStatus
  onClick?: () => void
}

// Prototype's .status-pill (projects-manager.js) is a solid color fill with white text/dot,
// unlike ColorPill's shared tinted default — other callers keep the tinted look.
const ProjectStatusPill = ({ status, onClick }: ProjectStatusPillProps) => (
  <ColorPill
    status={status}
    colorMap={PROJECT_STATUS_COLOR}
    labelMap={PROJECT_STATUS_LABEL}
    onClick={onClick}
    textColor="#fff"
    solid
    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold"
  />
)

export default ProjectStatusPill
