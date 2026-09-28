import { useState } from 'react'
import { FiDownload } from 'react-icons/fi'
import type { LeadEntity, LeadStatus } from '@/types/crm.types'
import { LEAD_ADVANCE_ACTION_LABEL, LEAD_STATUS_COLOR, LEAD_STATUS_TEXT_COLOR, LEAD_TRANSITION_MAP } from '@/types/crm.types'
import { downloadLeadsCsv } from '@/features/crm/crm.export'
import { formatINR } from '@/utils/formatters'
import { roleLabel, divisionLabel, tenantLabel, contactPersonLabel } from '@/features/crm/crm.utils'
import { Button } from '@/components/ui/button'
import CopyButton from '@/components/ui/CopyButton'
import UserAvatar from '@/components/ui/UserAvatar'
import StagePill from '@/features/crm/components/StagePill'
import LeadAdvanceModal from '@/features/crm/components/LeadAdvanceModal'

// Matches the prototype's column order/copy. "Follow-ups" has no real count
// source (no lead<->meeting relation on our Lead model — see ui-revisions.md)
// so it renders '—' rather than a fabricated number.
const COLUMNS = ['Lead', 'Company', 'Division', 'Person', 'Therapy', 'Status', 'Value', 'Follow-ups', 'Age', 'Status action', 'Owner']

function daysSince(date: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 86400000))
}

interface ListViewProps {
  leads: LeadEntity[]
  onOpen: (id: string) => void
  onMoveStage: (id: string, to: LeadStatus, reason: string) => void
  canManage: boolean
}

const ListView = ({ leads, onOpen, onMoveStage, canManage }: ListViewProps) => {
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
              <th
                key={h}
                className={`font-bold text-[11px] uppercase tracking-wider px-3 py-2 whitespace-nowrap ${h === 'Value' ? 'text-right' : h === 'Status action' || h === 'Follow-ups' ? 'text-center' : 'text-left'}`}
                style={{ color: 'var(--qms-text-muted)' }}
              >
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
                <td className="px-3 py-2 align-top max-w-48">
                  <div className="font-semibold" style={{ color: 'var(--qms-text)' }}>{lead.title}</div>
                  <div className="flex items-center gap-1.5 text-[11px] whitespace-nowrap" style={{ color: 'var(--qms-text-muted)' }}>
                    {lead.code}
                    <CopyButton value={lead.code} label="Code" />
                  </div>
                </td>
                <td className="px-3 py-2 max-w-40" style={{ color: 'var(--qms-text)' }}>{tenantLabel(lead.tenant)}</td>
                <td className="px-3 py-2 max-w-40" style={{ color: 'var(--qms-text)' }}>{divisionLabel(lead.division)}</td>
                <td className="px-3 py-2 text-[12px] max-w-40" style={{ color: 'var(--qms-text)' }}>{contactPersonLabel(lead.contactPerson)}</td>
                <td className="px-3 py-2 text-[12px] max-w-32 truncate" title={lead.focusTherapy.join(', ')} style={{ color: 'var(--qms-text)' }}>
                  {lead.focusTherapy.length > 1
                    ? `${lead.focusTherapy[0]}, +${lead.focusTherapy.length - 1}`
                    : lead.focusTherapy[0] || '—'}
                </td>
                <td className="px-3 py-2 whitespace-nowrap"><StagePill status={lead.status} /></td>
                <td className="px-3 py-2 whitespace-nowrap font-bold text-right" style={{ color: 'var(--qms-text)' }}>{formatINR(lead.estimatedValue)}</td>
                <td className="px-3 py-2 whitespace-nowrap text-center">
                  <span className="text-[10px] font-bold italic" style={{ color: 'var(--qms-brand)' }}>Coming soon</span>
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>{daysSince(lead.createdAt)}d</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {isFinal && (
                    <div className="flex justify-center" style={{ color: 'var(--qms-text-muted)' }}>-</div>
                  )}
                  {canManage && !isFinal && nextStatuses.length > 0 && (
                    <div className="flex flex-wrap gap-1 justify-center">
                      {nextStatuses.map((to) => (
                        <button
                          key={to}
                          onClick={(e) => {
                            e.stopPropagation()
                            setAdvance({ lead, to })
                          }}
                          className="text-[11px] font-semibold px-2 py-1 rounded-lg border transition-all hover:opacity-80"
                          style={{
                            borderColor: `color-mix(in srgb, ${LEAD_STATUS_COLOR[to]} 35%, transparent)`,
                            background: `color-mix(in srgb, ${LEAD_STATUS_COLOR[to]} 13%, transparent)`,
                            color: LEAD_STATUS_TEXT_COLOR[to],
                          }}
                        >
                          {LEAD_ADVANCE_ACTION_LABEL[to]}
                        </button>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <UserAvatar firstName={roleLabel(lead.salesPerson)} size="sm" />
                    <span className="text-[12px]" style={{ color: 'var(--qms-text)' }}>{roleLabel(lead.salesPerson).split(' ')[0]}</span>
                  </div>
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
