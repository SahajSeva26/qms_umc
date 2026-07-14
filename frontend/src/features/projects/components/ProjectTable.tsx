import type { Camp } from '@/types/camp.types'
import type { Project } from '@/types/project.types'
import { CLIENTS } from '@/types/client.types'
import { formatINR } from '@/utils/formatters'
import ProjectTypePill from '@/features/projects/components/ProjectTypePill'
import ProjectStatusPill from '@/features/projects/components/ProjectStatusPill'
import ProjectExecutionCell from '@/features/projects/components/ProjectExecutionCell'
import ProjectCampsCell from '@/features/projects/components/ProjectCampsCell'
import ProjectRowMenu from '@/features/projects/components/ProjectRowMenu'
import { SALES_PEOPLE } from '@/features/projects/projects.mock'

const COLUMNS = ['ID', 'Project', 'Type', 'Execution', 'POs', 'Camps', 'Value', 'Status', 'Owner', '']

function clientName(clientId: string): string {
  return CLIENTS.find((c) => c.id === clientId)?.name ?? '—'
}

function ownerFirstName(salesPersonId: string): string {
  const name = SALES_PEOPLE.find((p) => p.id === salesPersonId)?.name
  return name ? name.split(' ')[0] : '—'
}

interface ProjectTableProps {
  projects: Project[]
  camps: Camp[]
  onOpenDetail: (id: string) => void
  onEdit: (id: string) => void
  onChangeStatus: (id: string) => void
  onRenew: (id: string) => void
  onAddVoidCamp: (id: string) => void
  onClose: (id: string) => void
  onReopen: (id: string) => void
}

const ProjectTable = ({ projects, camps, onOpenDetail, onEdit, onChangeStatus, onRenew, onAddVoidCamp, onClose, onReopen }: ProjectTableProps) => (
  <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--qms-border)' }}>
    <table className="w-full text-[13px]">
      <thead>
        <tr style={{ borderBottom: '1px solid var(--qms-border)' }}>
          {COLUMNS.map((h) => (
            <th key={h} className="text-left font-bold text-[11px] uppercase tracking-wider px-3 py-2 whitespace-nowrap" style={{ color: 'var(--qms-text-muted)' }}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {projects.map((project) => {
          const poCount = project.pos.length
          return (
            <tr
              key={project.id}
              onClick={() => onOpenDetail(project.id)}
              className="cursor-pointer transition-colors hover:bg-(--qms-surface-hover)"
              style={{ borderBottom: '1px solid var(--qms-border)' }}
            >
              <td className="px-3 py-2.5 align-top whitespace-nowrap">
                <div className="font-bold" style={{ color: 'var(--qms-text)' }}>{project.id}</div>
                <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{project.therapy || '—'}</div>
              </td>
              <td className="px-3 py-2.5 align-top">
                <div className="font-semibold" style={{ color: 'var(--qms-text)' }}>{project.name}</div>
                <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{clientName(project.clientId)}</div>
              </td>
              <td className="px-3 py-2.5 align-top whitespace-nowrap"><ProjectTypePill type={project.type} /></td>
              <td className="px-3 py-2.5 align-top whitespace-nowrap"><ProjectExecutionCell project={project} /></td>
              <td className="px-3 py-2.5 align-top whitespace-nowrap" style={{ color: 'var(--qms-text)' }}>
                {poCount} PO{poCount === 1 ? '' : 's'}
              </td>
              <td className="px-3 py-2.5 align-top"><ProjectCampsCell project={project} camps={camps} /></td>
              <td className="px-3 py-2.5 align-top text-right font-bold whitespace-nowrap" style={{ color: 'var(--qms-text)' }}>
                {formatINR(project.valueAfterGst || 0)}
              </td>
              <td className="px-3 py-2.5 align-top whitespace-nowrap">
                <ProjectStatusPill status={project.status} onClick={() => { onChangeStatus(project.id) }} />
              </td>
              <td className="px-3 py-2.5 align-top whitespace-nowrap" style={{ color: 'var(--qms-text)' }}>
                {ownerFirstName(project.salesPersonId)}
              </td>
              <td className="px-1 py-2.5 align-top whitespace-nowrap">
                <ProjectRowMenu
                  project={project}
                  onViewDetail={() => onOpenDetail(project.id)}
                  onEdit={() => onEdit(project.id)}
                  onChangeStatus={() => onChangeStatus(project.id)}
                  onRenew={() => onRenew(project.id)}
                  onAddVoidCamp={() => onAddVoidCamp(project.id)}
                  onClose={() => onClose(project.id)}
                  onReopen={() => onReopen(project.id)}
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
