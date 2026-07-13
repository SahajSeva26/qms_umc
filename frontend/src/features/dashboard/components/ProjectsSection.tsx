import { useState } from 'react'
import { FiFolder, FiEye } from 'react-icons/fi'
import { useDashboardData } from '@/features/dashboard/hooks/useDashboardData'
import { formatINR } from '@/utils/formatters'
import SectionCard from '@/features/dashboard/components/SectionCard'
import MiniKpiCard from '@/features/dashboard/components/MiniKpiCard'
import BarListRow from '@/features/dashboard/components/BarListRow'
import FilterChips from '@/features/dashboard/components/FilterChips'
import type { ProjectRow } from '@/types/dashboard.types'

const TYPE_FILTERS = ['ALL', 'Screening', 'Diet', 'Lab']

const STATUS_COLORS: Record<ProjectRow['status'], string> = {
  LIVE: 'var(--success)',
  PILOT: 'var(--warning)',
  PAUSED: 'var(--danger)',
}

const HEALTH_BUCKETS = [
  { label: '≥ 80 (good)', test: (h: number) => h >= 80, color: 'var(--success)' },
  { label: '60–79 (ok)', test: (h: number) => h >= 60 && h < 80, color: 'var(--warning)' },
  { label: '< 60 (risk)', test: (h: number) => h < 60, color: 'var(--danger)' },
]

interface ProjectsSectionProps {
  onDrill: (title: string, content: string) => void
}

const ProjectsSection = ({ onDrill }: ProjectsSectionProps) => {
  const [typeFilter, setTypeFilter] = useState('ALL')
  const { data } = useDashboardData()

  if (!data) return null
  const { project } = data

  const rows = typeFilter === 'ALL' ? project.breakdown : project.breakdown.filter((r) => r.type === typeFilter)
  const topByBilling = [...rows].sort((a, b) => b.billing - a.billing).slice(0, 6)
  const statusCounts = ['LIVE', 'PILOT', 'PAUSED'].map((s) => ({
    status: s as ProjectRow['status'],
    count: rows.filter((r) => r.status === s).length,
  }))
  const totalRows = rows.length || 1
  const healthCounts = HEALTH_BUCKETS.map((b) => ({ ...b, count: rows.filter((r) => b.test(r.health)).length }))

  return (
    <SectionCard
      icon={FiFolder}
      iconGradient="linear-gradient(135deg, #8b5cf6, var(--qms-brand))"
      title="Projects"
      subtitle={`${rows.length} matching · click any to drill`}
      headerAction={
        <button
          onClick={() => onDrill('All projects', `${project.breakdown.length} projects total`)}
          className="flex items-center gap-1.5 text-[12px] font-semibold px-2.5 py-1 rounded-lg border transition-all hover:bg-(--qms-surface-hover)"
          style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-soft)' }}
        >
          <FiEye size={13} /> View projects
        </button>
      }
    >
      <FilterChips options={TYPE_FILTERS} active={typeFilter} onChange={setTypeFilter} />

      <div className="grid gap-2.5 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
        <MiniKpiCard label="No. of Projects" data={project.totalProjects} />
        <MiniKpiCard label="Screening · Projects" data={project.screeningProjects} suffix={`· ${project.screeningProjects.camps?.v} camps`} />
        <MiniKpiCard label="Diet · Projects" data={project.dietProjects} suffix={`· ${project.dietProjects.camps?.v} camps`} />
        <MiniKpiCard label="Lab · Projects" data={project.labProjects} suffix={`· ${project.labProjects.camps?.v} camps`} />
        <MiniKpiCard label="Total Billing" data={project.totalBilling} />
        <MiniKpiCard label="Outstanding" data={project.outstanding} />
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <div>
          <h3 className="text-[12px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--qms-text-muted)' }}>
            Top projects by billing
          </h3>
          {topByBilling.map((row) => (
            <BarListRow
              key={row.id}
              label={row.id}
              sublabel={row.name}
              value={formatINR(row.billing)}
              share={(row.billing / (topByBilling[0]?.billing || 1)) * 100}
              gradient="linear-gradient(90deg, #8b5cf6, var(--qms-brand))"
              onClick={() =>
                onDrill(row.id, `${row.name} · ${row.type} · ${row.camps} camps · Health ${row.health} · Owner ${row.owner} · ${row.status}`)
              }
            />
          ))}
        </div>

        <div>
          <h3 className="text-[12px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--qms-text-muted)' }}>
            Project status mix
          </h3>
          <div
            className="flex h-5 rounded-full overflow-hidden mb-2 border"
            style={{ background: 'var(--qms-surface-strong)', borderColor: 'var(--qms-border)' }}
          >
            {statusCounts.filter((s) => s.count > 0).map((s) => (
              <div
                key={s.status}
                className="flex items-center justify-center text-[10px] font-bold text-white"
                style={{ width: `${(s.count / totalRows) * 100}%`, background: STATUS_COLORS[s.status] }}
              >
                {s.count}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-3 mb-4">
            {statusCounts.map((s) => (
              <div key={s.status} className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>
                <span className="w-2 h-2 rounded-full" style={{ background: STATUS_COLORS[s.status] }} />
                {s.status}: {s.count}
              </div>
            ))}
          </div>

          <h3 className="text-[12px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--qms-text-muted)' }}>
            Health distribution
          </h3>
          {healthCounts.map((b) => (
            <BarListRow
              key={b.label}
              label={b.label}
              value={String(b.count)}
              share={(b.count / totalRows) * 100}
              gradient={b.color}
            />
          ))}
        </div>
      </div>
    </SectionCard>
  )
}

export default ProjectsSection
