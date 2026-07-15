import { FiFilter, FiRotateCcw } from 'react-icons/fi'
import type { SalesRep } from '@/types/salesdash.types'
import type { Client, ClientProject, ClientProjectType } from '@/types/client.types'
import { DIVISIONS } from '@/types/client.types'
import type { SalesFilterState } from '@/features/crm/sales/sales.kpis'
import { DEFAULT_SALES_FILTER } from '@/features/crm/sales/sales.kpis'

const PROJECT_TYPES: ClientProjectType[] = ['Screening', 'Diet', 'Lab']

const selectClass = 'text-[12px] font-medium rounded-lg border px-2.5 py-1.5 min-w-[130px]'
const selectStyle = { background: 'var(--qms-surface-strong)', borderColor: 'var(--qms-border)', color: 'var(--qms-text)' }

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

      <select
        className={selectClass}
        style={selectStyle}
        value={filter.repId}
        onChange={(e) => onChange({ ...filter, repId: e.target.value })}
      >
        <option value="ALL">All sales people</option>
        {reps.map((r) => (
          <option key={r.id} value={r.id}>{r.name} · {r.role}</option>
        ))}
      </select>

      <select
        className={selectClass}
        style={selectStyle}
        value={filter.clientId}
        onChange={(e) => onChange({ ...filter, clientId: e.target.value, divisionId: 'ALL', projectId: 'ALL' })}
      >
        <option value="ALL">All companies</option>
        {clients.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>

      <select
        className={selectClass}
        style={selectStyle}
        value={filter.divisionId}
        onChange={(e) => onChange({ ...filter, divisionId: e.target.value, projectId: 'ALL' })}
      >
        <option value="ALL">All divisions</option>
        {divList.map((d) => (
          <option key={d.id} value={d.id}>{d.name}</option>
        ))}
      </select>

      <select
        className={selectClass}
        style={selectStyle}
        value={filter.projectId}
        onChange={(e) => onChange({ ...filter, projectId: e.target.value })}
      >
        <option value="ALL">All projects</option>
        {prjList.map((p) => (
          <option key={p.id} value={p.id}>{p.id} · {p.name}</option>
        ))}
      </select>

      <select
        className={selectClass}
        style={selectStyle}
        value={filter.projectType}
        onChange={(e) => onChange({ ...filter, projectType: e.target.value })}
      >
        <option value="ALL">All project types</option>
        {PROJECT_TYPES.map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>

      <button
        onClick={() => onChange(DEFAULT_SALES_FILTER)}
        className="flex items-center gap-1.5 text-[12px] font-semibold rounded-lg border px-2.5 py-1.5"
        style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-soft)' }}
      >
        <FiRotateCcw size={13} /> Reset
      </button>

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
