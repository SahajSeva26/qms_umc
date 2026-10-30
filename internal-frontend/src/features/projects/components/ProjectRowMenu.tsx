import { FiMoreHorizontal, FiEye, FiEdit2, FiTag, FiFileText } from 'react-icons/fi'
import { Popover, PopoverContent, PopoverTrigger } from '@qms/ui'

interface ProjectRowMenuProps {
  // Required, not optional — see ProjectTable.tsx's identical reasoning.
  canEdit: boolean
  // Separate from canEdit — PATCH /:id/stage (set-LIVE) is manage-only, no project:update path;
  // a Sales Rep (project:update, no project:manage) can edit but must not change status.
  canChangeStatus: boolean
  // Separate from canEdit — void-camp routes are gated on camp:manage/tenant:manage, not
  // project:manage, so neither permission set implies the other.
  canManageVoidCamps: boolean
  onViewDetail: () => void
  onEdit: () => void
  onChangeStatus: () => void
  onVoidCamps: () => void
}

const itemClasses = 'w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-[13px] font-medium text-left transition-colors hover:bg-(--qms-surface-hover)'

const ProjectRowMenu = ({ canEdit, canChangeStatus, canManageVoidCamps, onViewDetail, onEdit, onChangeStatus, onVoidCamps }: ProjectRowMenuProps) => (
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
      {canEdit && (
        <button className={itemClasses} style={{ color: 'var(--qms-text)' }} onClick={onEdit}>
          <FiEdit2 size={14} /> Edit
        </button>
      )}
      {canChangeStatus && (
        <button className={itemClasses} style={{ color: 'var(--qms-text)' }} onClick={onChangeStatus}>
          <FiTag size={14} /> Change status
        </button>
      )}
      {canManageVoidCamps && (
        <button className={itemClasses} style={{ color: 'var(--qms-text)' }} onClick={onVoidCamps}>
          <FiFileText size={14} /> Add void camp
        </button>
      )}
    </PopoverContent>
  </Popover>
)

export default ProjectRowMenu
