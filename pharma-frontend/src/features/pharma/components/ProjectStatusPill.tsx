import ColorPill from '@/components/ui/ColorPill'
import { PROJECT_STATUS_COLOR, PROJECT_STATUS_LABEL } from '@/types/project.types'
import type { ProjectStatus } from '@/types/project.types'

interface ProjectStatusPillProps {
  status: ProjectStatus
}

// Solid fill, white text/dot — reuses the shared ColorPill primitive. Mirrors internal-frontend's equivalent.
const ProjectStatusPill = ({ status }: ProjectStatusPillProps) => (
  <ColorPill
    status={status}
    colorMap={PROJECT_STATUS_COLOR}
    labelMap={PROJECT_STATUS_LABEL}
    textColor="#fff"
    solid
    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold"
  />
)

export default ProjectStatusPill
