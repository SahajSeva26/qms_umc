import { FiMoreHorizontal, FiEye, FiEdit2, FiRefreshCw, FiTag, FiPlusCircle, FiXCircle, FiRotateCcw } from 'react-icons/fi'
import type { Project } from '@/types/project.types'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface ProjectRowMenuProps {
  project: Project
  onViewDetail: () => void
  onEdit: () => void
  onChangeStatus: () => void
  onRenew: () => void
  onAddVoidCamp: () => void
  onClose: () => void
  onReopen: () => void
}

const itemClasses = 'w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-[13px] font-medium text-left transition-colors hover:bg-(--qms-surface-hover)'

const ProjectRowMenu = ({ project, onViewDetail, onEdit, onChangeStatus, onRenew, onAddVoidCamp, onClose, onReopen }: ProjectRowMenuProps) => (
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
      <div className="my-1 h-px" style={{ background: 'var(--qms-border)' }} />
      <button className={itemClasses} style={{ color: 'var(--qms-text)' }} onClick={onRenew}>
        <FiRefreshCw size={14} /> Renew
      </button>
      <button className={itemClasses} style={{ color: 'var(--qms-text)' }} onClick={onAddVoidCamp}>
        <FiPlusCircle size={14} /> Add void camp
      </button>
      <div className="my-1 h-px" style={{ background: 'var(--qms-border)' }} />
      {project.status !== 'CLOSED' ? (
        <button className={itemClasses} style={{ color: 'var(--danger)' }} onClick={onClose}>
          <FiXCircle size={14} /> Close project
        </button>
      ) : (
        <button className={itemClasses} style={{ color: 'var(--qms-text)' }} onClick={onReopen}>
          <FiRotateCcw size={14} /> Reopen
        </button>
      )}
    </PopoverContent>
  </Popover>
)

export default ProjectRowMenu
