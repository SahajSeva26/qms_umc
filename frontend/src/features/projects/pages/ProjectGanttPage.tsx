import { useMemo, useState } from 'react'
import { FiPlus, FiClock } from 'react-icons/fi'
import type { ProjectStatus } from '@/types/project.types'
import { useProjects } from '@/features/projects/hooks/useProjects'
import {
  computeGstBreakdown,
  computeProjectKpis,
  projectDateRange,
  projectHealthScore,
  projectNearestExpiry,
  projectTenantName,
} from '@/features/projects/projects.utils'
import { formatDate, formatINR } from '@/utils/formatters'
import GanttKpiStrip from '@/features/projects/components/GanttKpiStrip'
import ProjectStatusPill from '@/features/projects/components/ProjectStatusPill'
import ProjectTypePills from '@/features/projects/components/ProjectTypePill'
import NewProjectWizard from '@/features/projects/components/wizard/NewProjectWizard'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'

type StatusFilter = 'all' | ProjectStatus

// Timeline geometry — a project's bar spans [start, end] within the visible
// window (earliest start across all dated projects → latest end, padded a
// few days either side). Health score (0-100, see projectHealthScore) tints
// the bar; a project past its own end date still renders (clamped into the
// visible window) since a project can be overdue for renewal and still be
// the most operationally relevant row on the board.
const HEALTH_COLOR_GOOD = '#10b981'
const HEALTH_COLOR_WARN = '#f59e0b'
const HEALTH_COLOR_BAD = '#ef4444'

function healthColor(score: number): string {
  if (score >= 60) return HEALTH_COLOR_GOOD
  if (score >= 25) return HEALTH_COLOR_WARN
  return HEALTH_COLOR_BAD
}

const ProjectGanttPage = () => {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [wizardOpen, setWizardOpen] = useState(false)

  const { data, isLoading, error } = useProjects(statusFilter !== 'all' ? { status: statusFilter } : {})
  const projects = data?.data?.items ?? []

  const kpis = useMemo(() => computeProjectKpis(projects), [projects])

  // Only projects with a real date range (PO or agreement mode, both dates
  // present) can be plotted on a timeline. Mail-confirmation-mode projects
  // and any project with `mode` unset have nothing to plot — listed
  // separately below rather than silently dropped.
  const { dated, undated } = useMemo(() => {
    const dated: { project: (typeof projects)[number]; start: Date; end: Date }[] = []
    const undated: (typeof projects)[number][] = []
    for (const project of projects) {
      const range = projectDateRange(project)
      if (range) dated.push({ project, start: new Date(range.start), end: new Date(range.end) })
      else undated.push(project)
    }
    return { dated, undated }
  }, [projects])

  const timelineWindow = useMemo(() => {
    if (dated.length === 0) return null
    const starts = dated.map((d) => d.start.getTime())
    const ends = dated.map((d) => d.end.getTime())
    const padDays = 14 * 86_400_000
    return { from: Math.min(...starts) - padDays, to: Math.max(...ends) + padDays }
  }, [dated])

  return (
    <div className="max-w-5xl">
      <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
        <div>
          <div className="text-[12px] mb-1" style={{ color: 'var(--qms-text-muted)' }}>Delivery · Project Gantt</div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--qms-text)' }}>Project Gantt</h1>
          <p className="text-[12px] mt-1.5" style={{ color: 'var(--qms-text-muted)' }}>
            Timeline built from each project's PO/agreement start–end dates. Only
            PO- and agreement-based projects have a real date range to plot —
            mail-confirmation projects (no date fields) are listed separately below.
          </p>
        </div>
        <button
          onClick={() => setWizardOpen(true)}
          className="flex items-center gap-1.5 text-[13px] font-bold px-3.5 py-2 rounded-xl text-white shrink-0"
          style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
        >
          <FiPlus size={14} /> New project
        </button>
      </div>

      <GanttKpiStrip kpis={kpis} />

      <div className="flex items-center gap-2 mb-3">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="w-36 text-[13px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="live">Live</SelectItem>
            <SelectItem value="hold">Hold</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading && (
        <div className="text-[13px] py-10 text-center" style={{ color: 'var(--qms-text-muted)' }}>Loading projects…</div>
      )}
      {error && !isLoading && (
        <div className="text-[13px] rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">
          Failed to load projects. Please try again.
        </div>
      )}

      {!isLoading && !error && (
        <>
          {timelineWindow && (
            <div className="rounded-xl border overflow-hidden mb-4" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface)' }}>
              <div className="overflow-x-auto">
                <div style={{ minWidth: 640 }}>
                  {dated.map(({ project, start, end }) => {
                    const health = projectHealthScore(project)
                    const totalMs = timelineWindow.to - timelineWindow.from
                    const leftPct = ((start.getTime() - timelineWindow.from) / totalMs) * 100
                    const widthPct = Math.max(1, ((end.getTime() - start.getTime()) / totalMs) * 100)
                    return (
                      <div key={project.id} className="flex items-center gap-3 px-4 py-2.5" style={{ borderBottom: '1px solid var(--qms-border)' }}>
                        <div className="w-56 shrink-0 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-[12px] truncate" style={{ color: 'var(--qms-text)' }}>{project.name}</span>
                            <ProjectStatusPill status={project.status} />
                          </div>
                          <div className="text-[11px] truncate" style={{ color: 'var(--qms-text-muted)' }}>{projectTenantName(project)}</div>
                        </div>
                        <div className="relative flex-1 h-6" style={{ minWidth: 320 }}>
                          <div
                            className="absolute top-0.5 h-5 rounded-md"
                            style={{
                              left: `${leftPct}%`,
                              width: `${widthPct}%`,
                              background: health !== null ? healthColor(health) : 'var(--qms-text-muted)',
                              opacity: 0.85,
                            }}
                            title={`${formatDate(start.toISOString())} – ${formatDate(end.toISOString())}${health !== null ? ` · health ${health}` : ''}`}
                          />
                        </div>
                        <div className="w-16 shrink-0 text-right text-[11px] font-semibold" style={{ color: health !== null ? healthColor(health) : 'var(--qms-text-muted)' }}>
                          {health !== null ? `${health}%` : '—'}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {undated.length > 0 && (
            <div className="rounded-xl border backdrop-blur-xl divide-y" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface)' }}>
              <div className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--qms-text-muted)' }}>
                No date range (mail confirmation)
              </div>
              {undated.map((project) => {
                const expiry = projectNearestExpiry(project)
                const { valueAfterGST } = computeGstBreakdown(project.valueBeforeGST, project.gst)
                return (
                  <div key={project.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[13px]" style={{ color: 'var(--qms-text)' }}>{project.name}</span>
                        <ProjectStatusPill status={project.status} />
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{projectTenantName(project)}</span>
                        <ProjectTypePills types={project.type} />
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-bold text-[13px]" style={{ color: 'var(--qms-text)' }}>{formatINR(valueAfterGST)}</div>
                      {expiry ? (
                        <div className="flex items-center gap-1 justify-end text-[11px] mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>
                          <FiClock size={11} />
                          Expires {formatDate(expiry)}
                        </div>
                      ) : (
                        <div className="text-[11px] mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>No expiry (mail confirmation)</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {dated.length === 0 && undated.length === 0 && (
            <div className="rounded-xl border px-4 py-10 text-center text-[13px]" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface)', color: 'var(--qms-text-muted)' }}>
              No projects found.
            </div>
          )}
        </>
      )}

      {wizardOpen && (
        <NewProjectWizard
          editProject={null}
          onClose={() => setWizardOpen(false)}
          onSaved={() => setWizardOpen(false)}
        />
      )}
    </div>
  )
}

export default ProjectGanttPage
