import type { ProjectEntity } from '@/types/project.types'
import { PROJECT_THERAPY_LABEL, allowedCampTypesForProjectTypes } from '@/types/project.types'
import CopyButton from '@/components/ui/CopyButton'
import { formatINR } from '@/utils/formatters'
import { computeGstBreakdown, projectDivisionName, projectSalesRepName, projectTenantName } from '@/features/projects/projects.utils'
import ProjectTypePills from '@/features/projects/components/ProjectTypePill'
import ProjectStatusPill from '@/features/projects/components/ProjectStatusPill'
import ProjectExecutionCell from '@/features/projects/components/ProjectExecutionCell'
import ProjectRowMenu from '@/features/projects/components/ProjectRowMenu'

// Prototype splits "ID" (code + therapy) from "Project" (name + client · division). "POs" shown
// as "Upcoming" — our Project model has no pos[] array to count from (md-files/ui-revisions.md).
const COLUMNS = ['ID', 'Project', 'Type', 'Execution', 'POs', 'Total camps', 'Value', 'Status', 'Owner', '']
const CENTERED_COLUMNS = new Set(['Type', 'Execution', 'POs', 'Total camps', 'Value'])

interface ProjectTableProps {
  projects: ProjectEntity[]
  // Required, not optional, so a future caller can't silently render write
  // controls by omitting it. Mirrors the backend's project:manage/tenant:manage guard.
  canWrite: boolean
  // Separate from canWrite — void-camp actions are gated on camp:manage/tenant:manage, not
  // project:manage (see projects.utils.ts's VOID_CAMP_WRITE_PERMISSIONS).
  canManageVoidCamps: boolean
  onOpenDetail: (id: string) => void
  onEdit: (id: string) => void
  onChangeStatus: (id: string) => void
  onVoidCamps: (id: string) => void
}

// Prototype's .tbl (styles.css) — 13px base, 10px/12px cell padding, 11px/700/.06em uppercase
// header, no header background fill (just a border), row hover → --qms-surface-strong.
const ProjectTable = ({ projects, canWrite, canManageVoidCamps, onOpenDetail, onEdit, onChangeStatus, onVoidCamps }: ProjectTableProps) => (
  <div className="overflow-x-auto rounded-xl border backdrop-blur-xl" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface)' }}>
    <table className="w-full text-[13px]">
      <thead>
        <tr>
          {COLUMNS.map((h) => (
            <th
              key={h}
              className={`font-bold text-[11px] uppercase tracking-[.06em] px-3 py-2.5 whitespace-nowrap ${CENTERED_COLUMNS.has(h) ? 'text-center' : 'text-left'}`}
              style={{ color: 'var(--qms-text-muted)', borderBottom: '1px solid var(--qms-border)' }}
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {projects.map((project) => {
          const { valueAfterGST } = computeGstBreakdown(project.valueBeforeGST, project.gst)
          // A teleconsultation-only project hosts no physical camp type at all — its void-camp
          // form could never submit (no Type to pick), so hide the action entirely for it.
          const projectSupportsVoidCamps = allowedCampTypesForProjectTypes(project.type).length > 0
          return (
            <tr
              key={project.id}
              onClick={() => onOpenDetail(project.id)}
              className="cursor-pointer transition-colors hover:bg-(--qms-surface-strong)"
              style={{ borderBottom: '1px solid var(--qms-border)' }}
            >
              <td className="px-3 py-2.5 align-top whitespace-nowrap">
                <div className="flex items-center gap-1.5 font-semibold" style={{ color: 'var(--qms-text)' }}>
                  {project.code}
                  <CopyButton value={project.code} label="Code" />
                </div>
                <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>
                  {PROJECT_THERAPY_LABEL[project.therapy] ?? project.therapy}
                </div>
              </td>
              <td className="px-3 py-2.5 align-top">
                <div className="font-semibold" style={{ color: 'var(--qms-text)' }}>{project.name}</div>
                <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>
                  {projectTenantName(project)} · {projectDivisionName(project)}
                </div>
              </td>
              <td className="px-3 py-2.5 align-top whitespace-nowrap">
                <div className="flex flex-wrap justify-center gap-1"><ProjectTypePills types={project.type} /></div>
              </td>
              <td className="px-3 py-2.5 align-top text-center whitespace-nowrap"><ProjectExecutionCell project={project} /></td>
              <td className="px-3 py-2.5 align-top text-center whitespace-nowrap">
                <span className="text-[10px] font-bold italic" style={{ color: 'var(--qms-brand)' }}>Upcoming</span>
              </td>
              <td className="px-3 py-2.5 align-top text-center whitespace-nowrap" style={{ color: 'var(--qms-text)' }}>
                {project.stats
                  ? <>{project.stats.executedCamps}<span style={{ color: 'var(--qms-text-muted)' }}>/{project.totalCamps}</span></>
                  : project.totalCamps}
              </td>
              <td className="px-3 py-2.5 align-top text-center font-bold whitespace-nowrap" style={{ color: 'var(--qms-text)' }}>
                {formatINR(valueAfterGST)}
              </td>
              <td className="px-3 py-2.5 align-top whitespace-nowrap">
                <ProjectStatusPill status={project.status} onClick={canWrite ? () => { onChangeStatus(project.id) } : undefined} />
              </td>
              <td className="px-3 py-2.5 align-top whitespace-nowrap" style={{ color: 'var(--qms-text)' }}>
                {projectSalesRepName(project).split(' ')[0]}
              </td>
              <td className="px-1 py-2.5 align-top whitespace-nowrap">
                <ProjectRowMenu
                  canWrite={canWrite}
                  canManageVoidCamps={canManageVoidCamps && projectSupportsVoidCamps}
                  onViewDetail={() => onOpenDetail(project.id)}
                  onEdit={() => onEdit(project.id)}
                  onChangeStatus={() => onChangeStatus(project.id)}
                  onVoidCamps={() => onVoidCamps(project.id)}
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
