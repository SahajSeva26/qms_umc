import type { LeadEntity } from '@/types/crm.types'
import { LEAD_STATUS_LABEL } from '@/types/crm.types'
import { formatDate } from '@/utils/formatters'

interface ActivityTabProps {
  lead: LeadEntity
}

// stageHistory.createdBy never arrives populated (lead.service.ts's populate
// array has no entry for it — see LeadStageHistoryEntry's comment in
// crm.types.ts), so there's no real actor name to show here, unlike the
// from/to/reason/timestamp fields which are always real.
const ActivityTab = ({ lead }: ActivityTabProps) => {
  const entries = [
    ...lead.stageHistory.map((h) => ({
      label: `Moved from ${LEAD_STATUS_LABEL[h.from]} to ${LEAD_STATUS_LABEL[h.to]}`,
      detail: h.reason,
      at: h.createdAt,
    })),
    { label: 'Lead created', detail: undefined, at: lead.createdAt },
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())

  return (
    <div className="space-y-3">
      {entries.map((entry, i) => (
        <div key={i} className="flex gap-3">
          <div className="flex flex-col items-center pt-1">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: 'var(--qms-brand)' }} />
            {i < entries.length - 1 && <span className="w-px flex-1 mt-1" style={{ background: 'var(--qms-border)' }} />}
          </div>
          <div className="pb-3">
            <div className="text-[13px]" style={{ color: 'var(--qms-text)' }}>
              {entry.label}
              {entry.detail && <span style={{ color: 'var(--qms-text-muted)' }}> · {entry.detail}</span>}
            </div>
            <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{formatDate(entry.at)}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default ActivityTab
