import type { ProjectEntity } from '@/types/project.types'
import { formatINR } from '@/utils/formatters'
import { computeGstBreakdown, projectSalesRepName } from '@/features/projects/projects.utils'
import ProjectTypePills from '@/features/projects/components/ProjectTypePill'
import ProjectStatusPill from '@/features/projects/components/ProjectStatusPill'
import ProjectExecutionCell from '@/features/projects/components/ProjectExecutionCell'
import ProjectRowMenu from '@/features/projects/components/ProjectRowMenu'

const COLUMNS = ['Project', 'Type', 'Execution', 'Total camps', 'Value', 'Status', 'Owner', '']
const CENTERED_COLUMNS = new Set(['Type', 'Execution', 'Total camps', 'Value'])

interface ProjectTableProps {
  projects: ProjectEntity[]
  onOpenDetail: (id: string) => void
  onEdit: (id: string) => void
  onChangeStatus: (id: string) => void
}

const ProjectTable = ({ projects, onOpenDetail, onEdit, onChangeStatus }: ProjectTableProps) => (
  <div className="overflow-x-auto rounded-xl border backdrop-blur-xl" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface)' }}>
    <table className="w-full text-[13px]">
      <thead>
        <tr style={{ borderBottom: '1px solid var(--qms-border)', background: 'var(--qms-surface-strong)' }}>
          {COLUMNS.map((h) => (
            <th
              key={h}
              className={`font-bold text-[11px] uppercase tracking-wider px-3 py-2 whitespace-nowrap ${CENTERED_COLUMNS.has(h) ? 'text-center' : 'text-left'}`}
              style={{ color: 'var(--qms-text-muted)' }}
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {projects.map((project) => {
          const { valueAfterGST } = computeGstBreakdown(project.valueBeforeGST, project.gst)
          return (
            <tr
              key={project.id}
              onClick={() => onOpenDetail(project.id)}
              className="cursor-pointer transition-colors hover:bg-(--qms-surface-hover)"
              style={{ borderBottom: '1px solid var(--qms-border)' }}
            >
              <td className="px-3 py-2.5 align-top">
                <div className="font-semibold" style={{ color: 'var(--qms-text)' }}>{project.name}</div>
                <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{project.code}</div>
              </td>
              <td className="px-3 py-2.5 align-top whitespace-nowrap">
                <div className="flex flex-wrap justify-center gap-1"><ProjectTypePills types={project.type} /></div>
              </td>
              <td className="px-3 py-2.5 align-top text-center whitespace-nowrap"><ProjectExecutionCell project={project} /></td>
              <td className="px-3 py-2.5 align-top text-center whitespace-nowrap" style={{ color: 'var(--qms-text)' }}>
                {project.totalCamps}
              </td>
              <td className="px-3 py-2.5 align-top text-center font-bold whitespace-nowrap" style={{ color: 'var(--qms-text)' }}>
                {formatINR(valueAfterGST)}
              </td>
              <td className="px-3 py-2.5 align-top whitespace-nowrap">
                <ProjectStatusPill status={project.status} onClick={() => { onChangeStatus(project.id) }} />
              </td>
              <td className="px-3 py-2.5 align-top whitespace-nowrap" style={{ color: 'var(--qms-text)' }}>
                {projectSalesRepName(project).split(' ')[0]}
              </td>
              <td className="px-1 py-2.5 align-top whitespace-nowrap">
                <ProjectRowMenu
                  onViewDetail={() => onOpenDetail(project.id)}
                  onEdit={() => onEdit(project.id)}
                  onChangeStatus={() => onChangeStatus(project.id)}
                />
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
    {projects.length === 0 && (
      <div className="px-4 py-10 text-center text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>
        No projects found.
      </div>
    )}
  </div>
)

export default ProjectTable
