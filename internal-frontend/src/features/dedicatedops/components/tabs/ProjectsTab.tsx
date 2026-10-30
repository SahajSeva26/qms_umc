import { FiBriefcase, FiRadio, FiClipboard, FiDownload, FiUserPlus } from 'react-icons/fi'
import type { ProjectEntity } from '@/types/project.types'
import type { Assignment, DedicatedProjectConfig } from '@/features/dedicatedops/dedicatedops.types'
import KpiTile from '@/components/ui/KpiTile'
import { Button } from '@/components/ui/button'
import DoPill from '@/features/dedicatedops/components/DoPill'
import DoBar from '@/components/ui/DoBar'

interface ProjectsTabProps {
  dedicatedProjects: ProjectEntity[]
  projectConfigs: Record<string, DedicatedProjectConfig>
  /** Built once in the page (Phase 2) — do not rebuild this here. */
  assignmentsByProjectId: Map<string, Assignment[]>
  /** Built once in the page (Phase 2) — do not rebuild this here. */
  screeningsCountByProjectId: Map<string, number>
  fosDeployedCount: number
  fullyCompliantCount: number
  overdueCount: number
  onOpenProject: (projectId: string) => void
  onAssignFo: (projectId: string) => void
  onExport: (projectId: string) => void
}

// KPI strip + dedicated-projects table. Pure render: every number and index
// here is computed once in DedicatedOpsPage (or useDedicatedOpsCompliance)
// and passed in — this component does no array scanning of its own beyond
// the O(1) Map.get() per row that Phase 2 already established.
const ProjectsTab = ({
  dedicatedProjects, projectConfigs, assignmentsByProjectId, screeningsCountByProjectId,
  fosDeployedCount, fullyCompliantCount, overdueCount, onOpenProject, onAssignFo, onExport,
}: ProjectsTabProps) => {
  return (
    <>
      <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
        <KpiTile label="Dedicated projects" value={String(dedicatedProjects.length)} tone="violet" icon={FiBriefcase} />
        <KpiTile label="FOs deployed" value={String(fosDeployedCount)} tone="brand" icon={FiUserPlus} />
        <KpiTile label="Fully compliant" value={String(fullyCompliantCount)} tone="emerald" icon={FiClipboard} />
        <KpiTile label="Overdue" value={String(overdueCount)} tone="rose" icon={FiRadio} />
      </div>

      <div className="rounded-xl border overflow-x-auto" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)', backdropFilter: 'blur(20px)' }}>
        <table className="w-full text-[13px]">
          <thead>
            <tr style={{ background: 'var(--qms-surface-strong)' }}>
              {['Project', 'Type', 'FO fill rate', 'Territory', 'Screenings', 'Status', ''].map((h) => (
                <th key={h} className="text-left font-semibold px-3 py-2.5 text-[11px] uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dedicatedProjects.map((p) => {
              const cfg = projectConfigs[p.id]
              const onProject = assignmentsByProjectId.get(p.id) ?? []
              const required = cfg?.manpowerRequired.fo ?? 0
              const fillPct = required ? Math.round((onProject.length / required) * 100) : 0
              const screeningsCount = screeningsCountByProjectId.get(p.id) ?? 0
              return (
                <tr
                  key={p.id}
                  onClick={() => onOpenProject(p.id)}
                  className="border-t cursor-pointer"
                  style={{ borderColor: 'var(--qms-border)' }}
                >
                  <td className="px-3 py-2.5">
                    <div className="font-semibold" style={{ color: 'var(--qms-text)' }}>{p.id}</div>
                    <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{p.name}</div>
                  </td>
                  <td className="px-3 py-2.5"><DoPill tone="dedi">Dedicated</DoPill></td>
                  <td className="px-3 py-2.5 w-40">
                    <div className="text-[11px] mb-1" style={{ color: 'var(--qms-text-muted)' }}>{onProject.length}/{required} FOs</div>
                    <DoBar pct={fillPct} color={fillPct >= 100 ? '#10b981' : '#f59e0b'} />
                  </td>
                  <td className="px-3 py-2.5" style={{ color: 'var(--qms-text-soft)' }}>{cfg?.territory.city || '—'}{cfg?.territory.state ? `, ${cfg.territory.state}` : ''}</td>
                  <td className="px-3 py-2.5 text-center tabular-nums" style={{ color: 'var(--qms-text)' }}>{screeningsCount}</td>
                  <td className="px-3 py-2.5"><DoPill tone={fillPct >= 100 ? 'ok' : 'warn'}>{fillPct >= 100 ? 'Fully staffed' : 'Understaffed'}</DoPill></td>
                  <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1.5">
                      <Button size="sm" variant="outline" onClick={() => onAssignFo(p.id)}>Assign FO</Button>
                      <Button size="sm" variant="ghost" onClick={() => onExport(p.id)}><FiDownload size={12} /></Button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {dedicatedProjects.length === 0 && (
              <tr><td colSpan={7} className="text-center py-8 text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>No dedicated projects yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}

export default ProjectsTab
