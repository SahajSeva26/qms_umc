import { FiFileText, FiFile, FiMail } from 'react-icons/fi'
import type { ExecutionModeType, ProjectEntity } from '@/types/project.types'
import { EXECUTION_MODE_LABEL } from '@/types/project.types'
import { formatDate } from '@/utils/formatters'

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

// Backend's `mode` is a nested object (project.model.ts's executionModeSchema),
// not a bare string — dots into `project.mode.mode`/`.poNumber`/`.poExpiry`
// throughout, unlike the old mock which treated executionMode as if it WERE
// the string discriminator.
const ProjectExecutionCell = ({ project }: ProjectExecutionCellProps) => {
  if (!project.mode) {
    return <span className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>—</span>
  }

  const { mode, poNumber, poExpiry } = project.mode
  const Icon = ICONS[mode]
  const color = COLORS[mode]

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
      {mode === 'po' && poNumber && (
        <div className="text-[11px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>{poNumber}</div>
      )}
      {mode === 'po' && poExpiry && (
        <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>expires {formatDate(poExpiry)}</div>
      )}
    </div>
  )
}

export default ProjectExecutionCell
