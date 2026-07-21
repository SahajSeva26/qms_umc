import { useState } from 'react'
import { FiDownload } from 'react-icons/fi'
import type { LeadEntity, LeadStatus } from '@/types/crm.types'
import { LEAD_STATUS_LABEL, LEAD_TRANSITION_MAP } from '@/types/crm.types'
import { downloadLeadsCsv } from '@/features/crm/crm.export'
import { formatINR, formatDate } from '@/utils/formatters'
import { roleLabel, divisionLabel } from '@/features/crm/crm.utils'
import { Button } from '@/components/ui/button'
import StagePill from '@/features/crm/components/StagePill'
import LeadAdvanceModal from '@/features/crm/components/LeadAdvanceModal'

const COLUMNS = ['Title', 'Contact / Division', 'Sales rep', 'Status', 'Value', 'Created', '']

interface ListViewProps {
  leads: LeadEntity[]
  onOpen: (id: string) => void
  onMoveStage: (id: string, to: LeadStatus, reason: string) => void
}

const ListView = ({ leads, onOpen, onMoveStage }: ListViewProps) => {
  const [advance, setAdvance] = useState<{ lead: LeadEntity; to: LeadStatus } | null>(null)

  const handleExport = () => downloadLeadsCsv(leads, `crm-leads-${new Date().toISOString().slice(0, 10)}.csv`)

  return (
  <div
    className="rounded-xl border overflow-hidden"
    style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}
  >
    <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--qms-border)' }}>
      <div>
        <div className="text-sm font-bold" style={{ color: 'var(--qms-text)' }}>Leads ({leads.length})</div>
        <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>Click any row to open the lead drawer</div>
      </div>
      <Button size="sm" variant="outline" onClick={handleExport} disabled={leads.length === 0}>
        <FiDownload size={13} /> Export ({leads.length})
      </Button>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr style={{ borderBottom: '1px solid var(--qms-border)' }}>
            {COLUMNS.map((h) => (
              <th key={h} className="text-left font-bold text-[11px] uppercase tracking-wider px-3 py-2 whitespace-nowrap" style={{ color: 'var(--qms-text-muted)' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => {
            const nextStatuses = LEAD_TRANSITION_MAP[lead.status]
            const isFinal = lead.status === 'won' || lead.status === 'lost'

            return (
              <tr
                key={lead.id}
                onClick={() => onOpen(lead.id)}
                className="cursor-pointer transition-colors hover:bg-(--qms-surface-hover)"
                style={{ borderBottom: '1px solid var(--qms-border)' }}
              >
                <td className="px-3 py-2 font-bold whitespace-nowrap" style={{ color: 'var(--qms-text)' }}>{lead.title}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <div className="font-semibold" style={{ color: 'var(--qms-text)' }}>{roleLabel(lead.contactPerson)}</div>
                  <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{divisionLabel(lead.division)}</div>
                </td>
                <td className="px-3 py-2 whitespace-nowrap" style={{ color: 'var(--qms-text)' }}>{roleLabel(lead.salesPerson)}</td>
                <td className="px-3 py-2 whitespace-nowrap"><StagePill status={lead.status} /></td>
                <td className="px-3 py-2 whitespace-nowrap font-bold text-right" style={{ color: 'var(--qms-text)' }}>{formatINR(lead.estimatedValue)}</td>
                <td className="px-3 py-2 whitespace-nowrap" style={{ color: 'var(--qms-text-muted)' }}>{formatDate(lead.createdAt)}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {lead.status === 'won' && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-success-soft text-success">WON</span>}
                  {lead.status === 'lost' && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-danger-soft text-danger">LOST</span>}
                  {!isFinal && nextStatuses.length > 0 && (
                    <div className="flex flex-wrap gap-1 justify-end">
                      {nextStatuses.map((to) => (
                        <button
                          key={to}
                          onClick={(e) => {
                            e.stopPropagation()
                            setAdvance({ lead, to })
                          }}
                          className="text-[11px] font-semibold px-2 py-1 rounded-lg border transition-all hover:bg-(--qms-surface-hover)"
                          style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-soft)' }}
                        >
                          {LEAD_STATUS_LABEL[to]} →
                        </button>
                      ))}
                    </div>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {leads.length === 0 && (
        <div className="px-4 py-10 text-center text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>
          No leads found.
        </div>
      )}
    </div>

    {advance && (
      <LeadAdvanceModal
        leadId={advance.lead.id}
        currentStatus={advance.lead.status}
        toStatus={advance.to}
        onMoveStage={onMoveStage}
        onClose={() => setAdvance(null)}
      />
    )}
  </div>
  )
}

export default ListView
