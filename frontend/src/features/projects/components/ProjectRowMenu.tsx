import { FiMoreHorizontal, FiEye, FiEdit2, FiTag } from 'react-icons/fi'
import type { ProjectEntity } from '@/types/project.types'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface ProjectRowMenuProps {
  project: ProjectEntity
  onViewDetail: () => void
  onEdit: () => void
  onChangeStatus: () => void
}

const itemClasses = 'w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-[13px] font-medium text-left transition-colors hover:bg-(--qms-surface-hover)'

// Renew/Add-void-camp/separate-Close menu items removed — the backend
// exposes a single generic moveStage(to, reason) endpoint; "close" is just
// a stage move to 'closed' via the same Change-status dialog (see
// StatusChangeDialog, which lists only the legal next statuses from the
// project's current one). Renew has no backend clone/renew endpoint at all
// (dropped per explicit decision). Void-camp status lives on individual Camp
// records, not Project — out of scope for this module.
const ProjectRowMenu = ({ project: _project, onViewDetail, onEdit, onChangeStatus }: ProjectRowMenuProps) => (
  <Popover>
    <PopoverTrigger
      onClick={(e) => e.stopPropagation()}
      className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors hover:bg-(--qms-surface-hover)"
      style={{ color: 'var(--qms-text-muted)' }}
      aria-label="Project actions"
    >
      <FiMoreHorizontal size={16} />
    </PopoverTrigger>
    <PopoverContent align="end" className="w-56 p-1.5" onClick={(e) => e.stopPropagation()}>
      <button className={itemClasses} style={{ color: 'var(--qms-text)' }} onClick={onViewDetail}>
        <FiEye size={14} /> View details
      </button>
      <button className={itemClasses} style={{ color: 'var(--qms-text)' }} onClick={onEdit}>
        <FiEdit2 size={14} /> Edit
      </button>
      <button className={itemClasses} style={{ color: 'var(--qms-text)' }} onClick={onChangeStatus}>
        <FiTag size={14} /> Change status
      </button>
    </PopoverContent>
  </Popover>
)

export default ProjectRowMenu
