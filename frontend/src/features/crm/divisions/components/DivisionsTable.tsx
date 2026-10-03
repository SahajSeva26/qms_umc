import { FiChevronRight, FiPackage } from 'react-icons/fi'
import type { DivisionEntity } from '@/types/crm.types'
import { DIVISION_THERAPY_LABEL } from '@/types/crm.types'

// "Projects per division" needs the caller to have passed report=true on its own useDivisions() search.
function ownerName(owner: DivisionEntity['owner']): string | null {
  if (!owner || typeof owner === 'string') return null
  if (!owner.user) return null
  return [owner.user.firstName, owner.user.lastName].filter(Boolean).join(' ')
}

interface StatProps {
  value: React.ReactNode
  label: string
}

const Stat = ({ value, label }: StatProps) => (
  <div className="w-16 shrink-0">
    <div className="text-[13px] font-extrabold leading-tight whitespace-nowrap" style={{ color: 'var(--qms-text)' }}>
      {value}
    </div>
    <div className="text-[9px] font-bold uppercase tracking-wide mt-0.5 whitespace-nowrap" style={{ color: 'var(--qms-text-muted)', letterSpacing: '.04em' }}>
      {label}
    </div>
  </div>
)

interface DivisionsTableProps {
  divisions: DivisionEntity[]
  onRowClick: (division: DivisionEntity) => void
}

const DivisionsTable = ({ divisions, onRowClick }: DivisionsTableProps) => {
  // pt-px: the first row's hover:-translate-y-px would otherwise clip its own top border against this container's edge.
  return (
    <div className="flex flex-col gap-2 overflow-x-auto pt-px">
      {divisions.map((division) => (
        <div
          key={division.id}
          onClick={() => onRowClick(division)}
          className="flex items-center gap-3 px-4 py-3 min-w-150 rounded-[11px] border cursor-pointer transition-transform duration-100 hover:-translate-y-px"
          style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#8b5cf6')}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--qms-border)')}
        >
          <div className="flex-1 min-w-32">
            <div className="text-[14px] font-extrabold truncate" style={{ color: 'var(--qms-text)' }}>
              {division.name}
            </div>
            <div className="flex items-center gap-1 text-[11px] mt-0.5 truncate" style={{ color: 'var(--qms-text-muted)' }}>
              <FiPackage className="shrink-0" size={11} />
              <span className="truncate">
                {division.therapy.map((t) => DIVISION_THERAPY_LABEL[t]).join(', ') || 'General'} · {division.code}
              </span>
            </div>
          </div>

          <Stat
            value={
              division.stats
                ? division.stats.totalProjects
                : <span className="text-[10px] font-bold italic" style={{ color: 'var(--qms-text-muted)' }}>—</span>
            }
            label="Projects"
          />
          <Stat value={division.mrCount} label="MRs" />

          <div className="w-28 shrink-0 text-[11px] truncate" style={{ color: 'var(--qms-text-muted)' }}>
            {ownerName(division.owner) ?? '—'}
          </div>

          <div className="w-16 shrink-0">
            {division.status ? (
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${division.status === 'active' ? 'bg-success-soft text-success' : ''}`}
                style={division.status !== 'active' ? { background: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' } : undefined}
              >
                {division.status === 'active' ? 'ACTIVE' : 'INACTIVE'}
              </span>
            ) : (
              <span style={{ color: 'var(--qms-text-muted)' }}>—</span>
            )}
          </div>

          <FiChevronRight className="shrink-0" size={16} style={{ color: 'var(--qms-text-muted)' }} />
        </div>
      ))}

      {divisions.length === 0 && (
        <div
          className="px-4 py-10 text-center text-[13px] rounded-xl border border-dashed"
          style={{ color: 'var(--qms-text-muted)', borderColor: 'var(--qms-border)' }}
        >
          No divisions found.
        </div>
      )}
    </div>
  )
}

export default DivisionsTable
