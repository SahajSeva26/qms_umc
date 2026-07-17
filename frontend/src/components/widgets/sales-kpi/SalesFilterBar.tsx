import { FiFilter, FiRotateCcw } from 'react-icons/fi'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import type { SalesRep } from '@/types/salesdash.types'
import type { Client, ClientProject, ClientProjectType } from '@/types/client.types'
import { DIVISIONS } from '@/types/client.types'
import type { SalesFilterState } from '@/components/widgets/sales-kpi/sales.kpis'
import { DEFAULT_SALES_FILTER } from '@/components/widgets/sales-kpi/sales.kpis'

const PROJECT_TYPES: ClientProjectType[] = ['Screening', 'Diet', 'Lab']

interface SalesFilterBarProps {
  filter: SalesFilterState
  onChange: (filter: SalesFilterState) => void
  reps: SalesRep[]
  clients: Client[]
  projects: ClientProject[]
}

const SalesFilterBar = ({ filter, onChange, reps, clients, projects }: SalesFilterBarProps) => {
  const divList = DIVISIONS.filter((d) => filter.clientId === 'ALL' || d.clientId === filter.clientId)
  const prjList = projects.filter(
    (p) => (filter.clientId === 'ALL' || p.clientId === filter.clientId) && (filter.divisionId === 'ALL' || p.divisionId === filter.divisionId)
  )

  const activeCount = [filter.repId, filter.clientId, filter.divisionId, filter.projectId, filter.projectType].filter((v) => v !== 'ALL').length

  return (
    <div
      className="flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2.5 mb-3.5"
      style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}
    >
      <span className="flex items-center gap-1.5 text-[12px] font-bold shrink-0" style={{ color: 'var(--qms-text-soft)' }}>
        <FiFilter size={13} /> Filters
      </span>

      <Select value={filter.repId} onValueChange={(v) => onChange({ ...filter, repId: v as string })}>
        <SelectTrigger className="text-[12px]"><SelectValue placeholder="All sales people" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All sales people</SelectItem>
          {reps.map((r) => (
            <SelectItem key={r.id} value={r.id}>{r.name} · {r.role}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filter.clientId}
        onValueChange={(v) => onChange({ ...filter, clientId: v as string, divisionId: 'ALL', projectId: 'ALL' })}
      >
        <SelectTrigger className="text-[12px]"><SelectValue placeholder="All companies" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All companies</SelectItem>
          {clients.map((c) => (
            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filter.divisionId} onValueChange={(v) => onChange({ ...filter, divisionId: v as string, projectId: 'ALL' })}>
        <SelectTrigger className="text-[12px]"><SelectValue placeholder="All divisions" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All divisions</SelectItem>
          {divList.map((d) => (
            <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filter.projectId} onValueChange={(v) => onChange({ ...filter, projectId: v as string })}>
        <SelectTrigger className="text-[12px]"><SelectValue placeholder="All projects" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All projects</SelectItem>
          {prjList.map((p) => (
            <SelectItem key={p.id} value={p.id}>{p.id} · {p.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filter.projectType} onValueChange={(v) => onChange({ ...filter, projectType: v as string })}>
        <SelectTrigger className="text-[12px]"><SelectValue placeholder="All project types" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All project types</SelectItem>
          {PROJECT_TYPES.map((t) => (
            <SelectItem key={t} value={t}>{t}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button variant="outline" size="sm" onClick={() => onChange(DEFAULT_SALES_FILTER)}>
        <FiRotateCcw size={13} /> Reset
      </Button>

      {activeCount > 0 && (
        <span
          className="flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-full ml-auto"
          style={{ background: 'rgba(59,109,255,.1)', color: 'var(--qms-brand)' }}
        >
          <FiFilter size={11} /> {activeCount} active
        </span>
      )}
    </div>
  )
}

export default SalesFilterBar
