import { FiDownload } from 'react-icons/fi'
import type { Lead } from '@/types/lead.types'
import { STAGE_ORDER, STAGES } from '@/features/crm/crm.mock'
import { downloadLeadsCsv } from '@/features/crm/crm.export'
import { formatINR } from '@/utils/formatters'
import { Button } from '@/components/ui/button'
import StagePill from '@/features/crm/components/StagePill'
import ScoreChip from '@/features/crm/components/ScoreChip'
import UserAvatar from '@/components/ui/UserAvatar'

const COLUMNS = ['Lead', 'Subject', 'Account / Contact', 'Therapy / Division', 'Owner', 'Geography', 'Stage', 'Value', 'Score', 'Age', '']

interface ListViewProps {
  leads: Lead[]
  onOpen: (id: string) => void
  onAdvance: (id: string) => void
}

const ListView = ({ leads, onOpen, onAdvance }: ListViewProps) => {
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
            const nextIndex = STAGE_ORDER.indexOf(lead.stage) + 1
            const nextStage = nextIndex < STAGE_ORDER.length ? STAGES.find((s) => s.id === STAGE_ORDER[nextIndex]) : null
            const isFinal = lead.stage === 'won' || lead.stage === 'lost'

            return (
              <tr
                key={lead.id}
                onClick={() => onOpen(lead.id)}
                className="cursor-pointer transition-colors hover:bg-(--qms-surface-hover)"
                style={{ borderBottom: '1px solid var(--qms-border)' }}
              >
                <td className="px-3 py-2 font-bold whitespace-nowrap" style={{ color: 'var(--qms-text)' }}>{lead.id}</td>
                <td className="px-3 py-2 whitespace-nowrap" style={{ color: 'var(--qms-text-muted)' }}>{lead.subject ?? '—'}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <div className="font-semibold" style={{ color: 'var(--qms-text)' }}>{lead.account}</div>
                  <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{lead.contact}</div>
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <div style={{ color: 'var(--qms-text)' }}>{lead.therapy}</div>
                  <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{lead.division}</div>
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <UserAvatar firstName={lead.owner.split(' ')[0]} lastName={lead.owner.split(' ')[1]} tone={lead.ownerTone} size="sm" />
                    <span style={{ color: 'var(--qms-text)' }}>{lead.owner.split(' ')[0]}</span>
                  </div>
                </td>
                <td className="px-3 py-2 whitespace-nowrap" style={{ color: 'var(--qms-text-muted)' }}>{lead.geography}</td>
                <td className="px-3 py-2 whitespace-nowrap"><StagePill stage={lead.stage} /></td>
                <td className="px-3 py-2 whitespace-nowrap font-bold text-right" style={{ color: 'var(--qms-text)' }}>{formatINR(lead.value)}</td>
                <td className="px-3 py-2 whitespace-nowrap"><ScoreChip score={lead.score} size="sm" /></td>
                <td className="px-3 py-2 whitespace-nowrap" style={{ color: 'var(--qms-text-muted)' }}>{lead.age}d</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {lead.stage === 'won' && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-success-soft text-success">WON</span>}
                  {lead.stage === 'lost' && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-danger-soft text-danger">LOSS</span>}
                  {!isFinal && nextStage && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onAdvance(lead.id)
                      }}
                      className="text-[11px] font-semibold px-2 py-1 rounded-lg border transition-all hover:bg-(--qms-surface-hover)"
                      style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-soft)' }}
                    >
                      Move →
                    </button>
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
  </div>
  )
}

export default ListView
