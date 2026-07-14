import { useMemo, useState } from 'react'
import { FiCrosshair, FiDownload, FiPlus } from 'react-icons/fi'
import type { ProjectStatus } from '@/types/project.types'
import { CLIENTS } from '@/types/client.types'
import { useAuth } from '@/hooks/useAuth'
import { useProjects } from '@/features/projects/hooks/useProjects'
import { useCamps } from '@/features/camps/hooks/useCamps'
import { roleScopedProjects, computeProjectKpis, projectSearchMatches } from '@/features/projects/projects.utils'
import { GANTT_VIEWS, addDays, formatRangeLabel, type GanttViewId } from '@/features/projects/gantt.utils'
import GanttKpiStrip from '@/features/projects/components/GanttKpiStrip'
import GanttCopilotBanner from '@/features/projects/components/GanttCopilotBanner'
import GanttChart from '@/features/projects/components/GanttChart'
import NewProjectWizard from '@/features/projects/components/wizard/NewProjectWizard'
import { Input } from '@/components/ui/input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'

type StatusFilter = 'ALL' | ProjectStatus

const ProjectGanttPage = () => {
  const { user } = useAuth()
  const { projects, createProject } = useProjects()
  const { camps } = useCamps()

  const [view, setView] = useState<GanttViewId>('month')
  const [groupByClient, setGroupByClient] = useState(true)
  const [clientFilter, setClientFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [search, setSearch] = useState('')
  const [anchor, setAnchor] = useState<Date>(() => new Date())
  const [wizardOpen, setWizardOpen] = useState(false)

  const scoped = useMemo(() => roleScopedProjects(projects, user?.role), [projects, user])

  const filtered = useMemo(() => {
    return scoped.filter((p) => {
      if (clientFilter !== 'ALL' && p.clientId !== clientFilter) return false
      if (statusFilter !== 'ALL' && p.status !== statusFilter) return false
      const clientName = CLIENTS.find((c) => c.id === p.clientId)?.name ?? ''
      return projectSearchMatches(p, clientName, search)
    })
  }, [scoped, clientFilter, statusFilter, search])

  const kpis = useMemo(() => computeProjectKpis(scoped, camps), [scoped, camps])

  const activeView = GANTT_VIEWS[view]
  const rangeStartDate = addDays(anchor, -Math.floor(activeView.days / 2))
  const rangeEndDate = addDays(rangeStartDate, activeView.days)
  const rangeLabel = formatRangeLabel(rangeStartDate, rangeEndDate)

  const shiftAnchor = (direction: 1 | -1) => setAnchor((prev) => addDays(prev, direction * Math.round(activeView.days / 2)))

  return (
    <div className="max-w-7xl">
      <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
        <div>
          <div className="text-[12px] mb-1" style={{ color: 'var(--qms-text-muted)' }}>Operations · Project Gantt</div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--qms-text)' }}>Project Gantt</h1>
          <div className="flex flex-wrap gap-1.5 mt-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--success)' }} /> Timeline · live
            </span>
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' }}>
              Projects × camps
            </span>
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' }}>
              Health-scored
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setAnchor(new Date())}
            className="flex items-center gap-1.5 text-[13px] font-semibold px-3 py-2 rounded-xl border transition-colors"
            style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-soft)' }}
          >
            <FiCrosshair size={13} /> Today
          </button>
          <button className="flex items-center gap-1.5 text-[13px] font-semibold px-3 py-2 rounded-xl border transition-colors" style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-soft)' }}>
            <FiDownload size={13} /> Export PNG
          </button>
          <button
            onClick={() => setWizardOpen(true)}
            className="flex items-center gap-1.5 text-[13px] font-bold px-3.5 py-2 rounded-xl text-white shrink-0"
            style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
          >
            <FiPlus size={14} /> New project
          </button>
        </div>
      </div>

      <GanttCopilotBanner kpis={kpis} />
      <GanttKpiStrip kpis={kpis} />

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--qms-surface-strong)' }}>
          {(Object.keys(GANTT_VIEWS) as GanttViewId[]).map((id) => (
            <button
              key={id}
              onClick={() => setView(id)}
              className="text-[12px] font-semibold px-3 py-1.5 rounded-lg transition-colors"
              style={view === id ? { background: 'var(--qms-brand)', color: '#fff' } : { color: 'var(--qms-text-muted)' }}
            >
              {GANTT_VIEWS[id].label}
            </button>
          ))}
        </div>

        <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--qms-surface-strong)' }}>
          {[{ id: true, label: 'By client' }, { id: false, label: 'Flat' }].map((g) => (
            <button
              key={String(g.id)}
              onClick={() => setGroupByClient(g.id)}
              className="text-[12px] font-semibold px-3 py-1.5 rounded-lg transition-colors"
              style={groupByClient === g.id ? { background: 'var(--qms-brand)', color: '#fff' } : { color: 'var(--qms-text-muted)' }}
            >
              {g.label}
            </button>
          ))}
        </div>

        <Select value={clientFilter} onValueChange={(v) => setClientFilter(v as string)}>
          <SelectTrigger className="w-40 text-[13px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All clients</SelectItem>
            {CLIENTS.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="w-36 text-[13px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="LIVE">Live</SelectItem>
            <SelectItem value="HOLD">Hold</SelectItem>
            <SelectItem value="CLOSED">Closed</SelectItem>
          </SelectContent>
        </Select>

        <Input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search project..."
          className="text-[13px] w-48"
        />

        <div className="flex items-center gap-1.5 ml-auto">
          <button onClick={() => shiftAnchor(-1)} className="w-8 h-8 flex items-center justify-center rounded-lg border" style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-soft)' }} aria-label="Earlier">
            ‹
          </button>
          <span className="text-[12px] font-semibold whitespace-nowrap" style={{ color: 'var(--qms-text)' }}>{rangeLabel}</span>
          <button onClick={() => shiftAnchor(1)} className="w-8 h-8 flex items-center justify-center rounded-lg border" style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-soft)' }} aria-label="Later">
            ›
          </button>
        </div>
      </div>

      <GanttChart projects={filtered} camps={camps} groupByClient={groupByClient} anchor={anchor} view={activeView} />

      {wizardOpen && (
        <NewProjectWizard
          existingProjects={projects}
          editProject={null}
          onClose={() => setWizardOpen(false)}
          onCreate={(project) => {
            createProject(project)
            setWizardOpen(false)
          }}
          onUpdate={() => setWizardOpen(false)}
        />
      )}
    </div>
  )
}

export default ProjectGanttPage
