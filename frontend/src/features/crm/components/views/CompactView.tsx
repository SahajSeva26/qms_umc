import type { LeadEntity, LeadStatus } from '@/types/crm.types'
import { LEAD_STATUS_LABEL, LEAD_STATUS_COLOR } from '@/types/crm.types'
import { formatINR } from '@/utils/formatters'

const COLUMNS = Object.keys(LEAD_STATUS_LABEL) as LeadStatus[]

interface CompactViewProps {
  leads: LeadEntity[]
  onSelectStatus: (status: LeadStatus) => void
}

const CompactView = ({ leads, onSelectStatus }: CompactViewProps) => (
  <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
    {COLUMNS.map((status) => {
      const statusLeads = leads.filter((l) => l.status === status)
      const total = statusLeads.reduce((sum, l) => sum + l.estimatedValue, 0)

      return (
        <button
          key={status}
          onClick={() => onSelectStatus(status)}
          className="text-left rounded-2xl border p-4 transition-all hover:-translate-y-0.5"
          style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: LEAD_STATUS_COLOR[status] }} />
            <span className="text-[13px] font-bold" style={{ color: 'var(--qms-text)' }}>{LEAD_STATUS_LABEL[status]}</span>
          </div>
          <div className="text-2xl font-extrabold mb-1" style={{ color: 'var(--qms-text)' }}>{statusLeads.length}</div>
          <div className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>{formatINR(total)}</div>
        </button>
      )
    })}
  </div>
)

export default CompactView
