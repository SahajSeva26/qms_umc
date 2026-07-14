import { useMemo, useState } from 'react'
import { FiChevronRight, FiChevronDown } from 'react-icons/fi'
import type { Camp } from '@/types/camp.types'
import type { Project } from '@/types/project.types'
import { CLIENTS } from '@/types/client.types'
import { totalPoCamps, campsProgressPct } from '@/features/projects/projects.utils'
import { barGeometry, markerLeft, todayLineLeft, type GanttView } from '@/features/projects/gantt.utils'

interface GanttGroup {
  key: string
  label: string
  color: string
  projects: Project[]
}

function groupProjects(projects: Project[], groupByClient: boolean): GanttGroup[] {
  if (!groupByClient) return [{ key: 'all', label: 'All projects', color: '#3b6dff', projects }]

  const map = new Map<string, GanttGroup>()
  for (const p of projects) {
    const clientId = p.clientId || '__none__'
    if (!map.has(clientId)) {
      const client = CLIENTS.find((c) => c.id === clientId)
      map.set(clientId, { key: clientId, label: client?.name ?? 'Unassigned', color: client?.color ?? '#94a3b8', projects: [] })
    }
    map.get(clientId)!.projects.push(p)
  }
  return [...map.values()]
}

const STATUS_GRADIENT: Record<Project['status'], string> = {
  LIVE: 'linear-gradient(90deg, #3b82f6, #06b6d4)',
  HOLD: 'linear-gradient(90deg, #f59e0b, #fbbf24)',
  CLOSED: 'linear-gradient(90deg, #94a3b8, #cbd5e1)',
}

const CAMP_MARKER_COLOR: Record<string, string> = {
  CLOSED: '#10b981',
  COMPLETED: '#10b981',
  LIVE: '#3b82f6',
  CONFIRMED: '#3b82f6',
  REQUESTED: '#cbd5e1',
}

function campMarkerColor(status: string): string {
  if (status.startsWith('CANCEL')) return '#f43f5e'
  return CAMP_MARKER_COLOR[status] ?? '#cbd5e1'
}

interface ProjectGanttRowProps {
  project: Project
  camps: Camp[]
  rangeStartDate: Date
  view: GanttView
  trackWidth: number
}

const ProjectGanttRow = ({ project, camps, rangeStartDate, view, trackWidth }: ProjectGanttRowProps) => {
  const geometry = barGeometry(project.startDate, project.endDate, rangeStartDate, view)
  const pct = campsProgressPct(project, camps)
  const total = totalPoCamps(project)
  const now = Date.now()
  const endTime = project.endDate ? new Date(project.endDate).getTime() : 0
  const showRenewFlag = endTime > now && endTime - now < 60 * 86_400_000

  const projectCamps = camps.filter((c) => c.projectId === project.id)

  return (
    <div className="grid" style={{ gridTemplateColumns: '280px 1fr' }}>
      <div className="px-3 py-2.5 text-[12px]" style={{ borderBottom: '1px solid var(--qms-border)' }}>
        <div className="font-bold truncate" style={{ color: 'var(--qms-text)' }}>{project.id} · {pct}%</div>
        <div className="truncate" style={{ color: 'var(--qms-text-muted)' }}>{project.name}</div>
        <div style={{ color: 'var(--qms-text-muted)' }}>{project.name.split(' · ')[0]} · {project.campsDone}/{total} camps</div>
      </div>
      <div className="relative" style={{ width: trackWidth, minHeight: 56, borderBottom: '1px solid var(--qms-border)' }}>
        {geometry && (
          <div
            className="absolute top-3 h-6 rounded-md overflow-hidden"
            style={{ left: geometry.left, width: geometry.width, background: STATUS_GRADIENT[project.status] }}
            title={`${project.id} · ${pct}%`}
          >
            <div className="h-full" style={{ width: `${pct}%`, background: 'rgba(255,255,255,0.35)' }} />
          </div>
        )}
        {project.endDate &&
          (() => {
            const left = geometry ? markerLeft(project.endDate, rangeStartDate, view) : null
            if (left === null) return null
            return showRenewFlag ? (
              <div
                key="renew-flag"
                className="absolute top-1.5"
                style={{
                  left: left - 6,
                  width: 0,
                  height: 0,
                  borderLeft: '6px solid transparent',
                  borderRight: '6px solid transparent',
                  borderTop: '8px solid #f59e0b',
                }}
                title={`Renews ${project.endDate}`}
              />
            ) : null
          })()}
        {projectCamps.map((camp) => {
          const left = markerLeft(camp.date, rangeStartDate, view)
          if (left === null) return null
          return (
            <div
              key={camp.id}
              className="absolute top-9.5 w-2 h-2 rounded-full"
              style={{ left: left - 4, background: campMarkerColor(camp.status), border: '1px solid var(--qms-surface-card)' }}
              title={`${camp.id} · ${camp.status} · ${camp.date}`}
            />
          )
        })}
      </div>
    </div>
  )
}

interface GanttChartProps {
  projects: Project[]
  camps: Camp[]
  groupByClient: boolean
  anchor: Date
  view: GanttView
}

const GanttChart = ({ projects, camps, groupByClient, anchor, view }: GanttChartProps) => {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const rangeStartDate = useMemo(() => {
    const d = new Date(anchor)
    d.setDate(d.getDate() - Math.floor(view.days / 2))
    return d
  }, [anchor, view])

  const trackWidth = view.days * view.pxPerDay
  const groups = useMemo(() => groupProjects(projects, groupByClient), [projects, groupByClient])
  const todayLeft = todayLineLeft(rangeStartDate, view)

  const toggleGroup = (key: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  // Month/week ticks — evenly spaced date labels across the visible range.
  const tickCount = Math.min(view.days, view.id === 'week' ? 14 : view.id === 'month' ? 12 : 13)
  const ticks = useMemo(() => {
    const step = Math.max(1, Math.round(view.days / tickCount))
    const result: { left: number; label: string }[] = []
    for (let d = 0; d <= view.days; d += step) {
      const date = new Date(rangeStartDate)
      date.setDate(date.getDate() + d)
      result.push({ left: d * view.pxPerDay, label: date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) })
    }
    return result
  }, [rangeStartDate, view, tickCount])

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--qms-border)' }}>
      <div className="overflow-x-auto">
        <div style={{ minWidth: 280 + trackWidth }}>
          <div className="grid" style={{ gridTemplateColumns: '280px 1fr' }}>
            <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--qms-text-muted)', borderBottom: '1px solid var(--qms-border)', background: 'var(--qms-surface-strong)' }}>
              Project
            </div>
            <div className="relative" style={{ width: trackWidth, height: 28, borderBottom: '1px solid var(--qms-border)', background: 'var(--qms-surface-strong)' }}>
              {ticks.map((t) => (
                <div key={t.left} className="absolute top-1.5 text-[10px]" style={{ left: t.left, color: 'var(--qms-text-muted)' }}>
                  {t.label}
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            {todayLeft !== null && (
              <div
                className="absolute top-0 bottom-0 z-10"
                style={{ left: 280 + todayLeft, width: 2, background: 'var(--danger)' }}
              >
                <div
                  className="absolute top-0 -translate-x-1/2 text-[9px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap"
                  style={{ background: 'var(--danger)', color: '#fff', left: 1 }}
                >
                  TODAY
                </div>
              </div>
            )}

            {groups.map((group) => (
              <div key={group.key}>
                {groupByClient && (
                  <button
                    onClick={() => toggleGroup(group.key)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-[12px] font-bold text-left"
                    style={{ borderBottom: '1px solid var(--qms-border)', background: 'var(--qms-surface-card)', color: 'var(--qms-text)' }}
                  >
                    {collapsed.has(group.key) ? <FiChevronRight size={13} /> : <FiChevronDown size={13} />}
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: group.color }} />
                    {group.label}
                    <span className="font-normal" style={{ color: 'var(--qms-text-muted)' }}>
                      · {group.projects.length} project{group.projects.length === 1 ? '' : 's'}
                    </span>
                  </button>
                )}
                {!collapsed.has(group.key) &&
                  group.projects.map((project) => (
                    <ProjectGanttRow key={project.id} project={project} camps={camps} rangeStartDate={rangeStartDate} view={view} trackWidth={trackWidth} />
                  ))}
              </div>
            ))}

            {projects.length === 0 && (
              <div className="px-4 py-10 text-center text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>
                No projects match the current filters.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default GanttChart
