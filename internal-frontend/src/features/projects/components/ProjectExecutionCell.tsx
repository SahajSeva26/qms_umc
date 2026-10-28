import { FiFileText, FiFile, FiMail } from 'react-icons/fi'
import type { ExecutionModeType, ProjectEntity } from '@/types/project.types'
import { EXECUTION_MODE_LABEL } from '@/types/project.types'
import { formatDate } from '@/utils/formatters'
import { projectNearestExpiry } from '@/features/projects/projects.utils'

const ICONS: Record<ExecutionModeType, typeof FiFileText> = {
  po: FiFile,
  agreement: FiFileText,
  mail_confirmation: FiMail,
}

const COLORS: Record<ExecutionModeType, string> = {
  po: '#3b6dff',
  agreement: '#14b8a6',
  mail_confirmation: '#a855f7',
}

interface ProjectExecutionCellProps {
  project: ProjectEntity
}

// `po` mode supports multiple purchase orders — shows the first PO's number as "primary" plus
// the soonest expiry across all of them, with a "+N more" hint.
const ProjectExecutionCell = ({ project }: ProjectExecutionCellProps) => {
  if (!project.executionMode) {
    return <span className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>—</span>
  }

  const { mode, po } = project.executionMode
  const Icon = ICONS[mode]
  const color = COLORS[mode]
  const purchaseOrders = po?.purchaseOrders ?? []
  const nearestExpiry = projectNearestExpiry(project)

  return (
    <div>
      {/* Prototype's .mode-pill — 6px radius (not full pill), 2px/8px padding, 10px/700 text, 1px border. */}
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[6px] text-[10px] font-bold"
        style={{ background: `${color}1a`, color, border: `1px solid ${color}2e` }}
      >
        <Icon size={11} />
        {EXECUTION_MODE_LABEL[mode].split(' ')[0]}
      </span>
      {mode === 'po' && purchaseOrders[0]?.number && (
        <div className="text-[11px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>
          {purchaseOrders[0].number}
          {purchaseOrders.length > 1 && ` +${purchaseOrders.length - 1} more`}
        </div>
      )}
      {mode === 'po' && nearestExpiry && (
        <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>expires {formatDate(nearestExpiry)}</div>
      )}
    </div>
  )
}

export default ProjectExecutionCell
