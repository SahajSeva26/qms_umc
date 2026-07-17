import { FiFileText, FiFile, FiMail } from 'react-icons/fi'
import type { Project } from '@/types/project.types'
import { EXECUTION_MODES } from '@/types/project.types'
import { formatDate } from '@/utils/formatters'

const ICONS: Record<Project['executionMode'], typeof FiFileText> = {
  PO: FiFile,
  AGREEMENT: FiFileText,
  MAIL: FiMail,
}

interface ProjectExecutionCellProps {
  project: Project
}

const ProjectExecutionCell = ({ project }: ProjectExecutionCellProps) => {
  const meta = EXECUTION_MODES.find((m) => m.id === project.executionMode)
  const Icon = ICONS[project.executionMode]

  return (
    <div>
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
        style={{ background: `${meta?.color ?? '#94a3b8'}18`, color: meta?.color ?? '#94a3b8' }}
      >
        <Icon size={11} />
        {meta?.label.split(' ')[0] ?? project.executionMode}
      </span>
      {project.executionMode === 'PO' && project.poNo && (
        <div className="text-[11px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>{project.poNo}</div>
      )}
      {project.executionMode === 'PO' && project.poExpiry && (
        <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>expires {formatDate(project.poExpiry)}</div>
      )}
    </div>
  )
}

export default ProjectExecutionCell
