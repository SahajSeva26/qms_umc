import { FiMoreHorizontal, FiEye, FiEdit2, FiTag, FiFileText } from 'react-icons/fi'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface ProjectRowMenuProps {
  // Required, not optional — see ProjectTable.tsx's identical reasoning.
  canWrite: boolean
  // Separate from canWrite — gated on camp:manage/tenant:manage (the void-camp routes' real
  // guard), independent of project:manage. A project-only manager must not see this (it would
  // 403 on every action); a camp manager without project:manage must still see it.
  canManageVoidCamps: boolean
  onViewDetail: () => void
  onEdit: () => void
  onChangeStatus: () => void
  onVoidCamps: () => void
}

const itemClasses = 'w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-[13px] font-medium text-left transition-colors hover:bg-(--qms-surface-hover)'

// Edit/Change-status are omitted entirely (not just disabled) without canWrite; Add-void-camp is
// gated on its own, separate permission — View details stays, since it's a read action gated
// separately by the route guard.
const ProjectRowMenu = ({ canWrite, canManageVoidCamps, onViewDetail, onEdit, onChangeStatus, onVoidCamps }: ProjectRowMenuProps) => (
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
      {canWrite && (
        <>
          <button className={itemClasses} style={{ color: 'var(--qms-text)' }} onClick={onEdit}>
            <FiEdit2 size={14} /> Edit
          </button>
          <button className={itemClasses} style={{ color: 'var(--qms-text)' }} onClick={onChangeStatus}>
            <FiTag size={14} /> Change status
          </button>
        </>
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
