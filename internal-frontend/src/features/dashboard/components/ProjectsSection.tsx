import { useState } from 'react'
import { FiFolder } from 'react-icons/fi'
import { useDashboardData } from '@/features/dashboard/hooks/useDashboardData'
import { useDashboardProjects } from '@/features/dashboard/hooks/useDashboardProjects'
import { formatINR } from '@/utils/formatters'
import SectionCard from '@/features/dashboard/components/SectionCard'
import MiniKpiCard from '@/features/dashboard/components/MiniKpiCard'
import EmptyLiveData from '@/features/dashboard/components/EmptyLiveData'
import QueryStateBlock from '@/components/ui/QueryStateBlock'
import type { ProjectStatusRow } from '@/types/dashboard.types'

// Real backend values (project.constants.ts's PROJECT_STATUS) — there is no pilot/paused status.
const STATUS_LABEL: Record<ProjectStatusRow['status'], string> = {
  new: 'New',
  live: 'Live',
  hold: 'Hold',
  closed: 'Closed',
}

const STATUS_COLOR: Record<ProjectStatusRow['status'], string> = {
  new: 'linear-gradient(90deg,#64748b,#94a3b8)',
  live: 'linear-gradient(90deg,#10b981,#34d399)',
  hold: 'linear-gradient(90deg,#f59e0b,#fbbf24)',
  closed: 'linear-gradient(90deg,#3b6dff,#60a5fa)',
}

const STATUS_DOT: Record<ProjectStatusRow['status'], string> = {
  new: '#64748b',
  live: '#10b981',
  hold: '#f59e0b',
  closed: '#3b6dff',
}

const ProjectsSection = () => {
  const [tab, setTab] = useState<'ALL' | ProjectStatusRow['status']>('ALL')
  const { data } = useDashboardData()
  const { data: dashboardProjects, isLoading: topProjectsLoading, isError: topProjectsErrored, refetch: refetchTopProjects } = useDashboardProjects()
  const topProjects = dashboardProjects?.topByEstimatedValue

  if (!data) return null
  const { project } = data

  const statusMix = tab === 'ALL' ? project.statusMix : project.statusMix.filter((s) => s.status === tab)
  const totalStatusMix = statusMix.reduce((sum, s) => sum + s.count, 0) || 1

  return (
    <SectionCard
      icon={FiFolder}
      iconGradient="linear-gradient(135deg, #8b5cf6, var(--qms-brand))"
      title="Projects"
      subtitle="Project counts by type"
    >
      {project.statusMix.length > 0 && (
        <div className="flex gap-1 flex-wrap mb-3">
          {(['ALL', 'new', 'live', 'hold', 'closed'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setTab(s)}
              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all"
              style={
                tab === s
                  ? { background: 'var(--qms-brand)', borderColor: 'var(--qms-brand)', color: '#fff' }
                  : { background: 'var(--qms-surface-strong)', borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }
              }
            >
              {s === 'ALL' ? 'All' : STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-2.5 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
        <MiniKpiCard label="No. of Projects" data={project.totalProjects} />
        <MiniKpiCard label="Screening · Projects" data={project.screeningProjects} />
        <MiniKpiCard label="Diet · Projects" data={project.dietProjects} />
        <MiniKpiCard label="Lab · Projects" data={project.labProjects} />
        <MiniKpiCard label="Estimated Project Value" data={project.estimatedValue} />
        <MiniKpiCard label="Outstanding" data={project.outstanding} />
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <div>
          <h3 className="text-[12px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--qms-text-muted)' }}>
            Top projects by estimated value
          </h3>
          <QueryStateBlock
            isLoading={topProjectsLoading}
            error={topProjectsErrored}
            loadingLabel="Loading…"
            errorLabel="Failed to load project value data."
            onRetry={refetchTopProjects}
          >
            {!topProjects || topProjects.length === 0 ? (
              <EmptyLiveData />
            ) : (
              <div className="space-y-2">
                {topProjects.map((p) => {
                  const maxValue = topProjects[0]?.estimatedValue || 1
                  return (
                    <div key={p.id} className="grid grid-cols-[minmax(0,140px)_1fr_auto] gap-3 items-center py-1">
                      <div className="min-w-0">
                        <div className="text-[11px] font-semibold truncate" style={{ color: 'var(--qms-text)' }}>{p.code}</div>
                        <div className="text-[11px] truncate" style={{ color: 'var(--qms-text-muted)' }}>{p.clientName} · {p.therapyLabel}</div>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--qms-surface-strong)' }}>
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${Math.min(100, Math.max(0, (p.estimatedValue / maxValue) * 100))}%`, background: 'linear-gradient(90deg,#8b5cf6,#3b6dff)' }}
                        />
                      </div>
                      <div className="text-[12px] font-bold shrink-0 tabular-nums" style={{ color: 'var(--qms-text)' }}>{formatINR(p.estimatedValue)}</div>
                    </div>
                  )
                })}
              </div>
            )}
          </QueryStateBlock>
        </div>

        <div>
          <h3 className="text-[12px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--qms-text-muted)' }}>
            Project status mix
          </h3>
          {statusMix.length === 0 ? (
            <EmptyLiveData />
          ) : (
            <>
              <div className="flex h-5 rounded-full overflow-hidden mb-2" style={{ background: 'var(--qms-surface-strong)' }}>
                {statusMix.filter((s) => s.count > 0).map((s) => (
                  <div
                    key={s.status}
                    className="flex items-center justify-center text-[10px] font-bold text-white"
                    style={{ width: `${(s.count / totalStatusMix) * 100}%`, background: STATUS_COLOR[s.status] }}
                  >
                    {s.count}
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-3 text-[11px]" style={{ color: 'var(--qms-text-soft)' }}>
                {statusMix.map((s) => (
                  <span key={s.status} className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: STATUS_DOT[s.status] }} />
                    {STATUS_LABEL[s.status].toUpperCase()}: <b>{s.count}</b>
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </SectionCard>
  )
}

export default ProjectsSection
