import { FiClock } from 'react-icons/fi'
import type { LeadEntity, LeadStatus } from '@/types/crm.types'
import { LEAD_STATUS_LABEL, LEAD_TRANSITION_MAP } from '@/types/crm.types'
import { formatINR } from '@/utils/formatters'
import { roleLabel, divisionLabel } from '@/features/crm/crm.utils'
import UserAvatar from '@/components/ui/UserAvatar'

interface LeadCardProps {
  lead: LeadEntity
  onOpen: (id: string) => void
  // Omitted (not just a no-op) when the caller lacks lead:manage/tenant:manage
  // — hides the "Move to X" buttons entirely rather than showing controls
  // that would only 403 on click.
  onAdvance?: (id: string, to: LeadStatus) => void
  draggable?: boolean
  onDragStart?: (e: React.DragEvent, id: string) => void
  onDragEnd?: (e: React.DragEvent) => void
}

function daysSince(date: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 86400000))
}

const LeadCard = ({ lead, onOpen, onAdvance, draggable, onDragStart, onDragEnd }: LeadCardProps) => {
  const nextStatuses = LEAD_TRANSITION_MAP[lead.status]
  const isFinal = lead.status === 'won' || lead.status === 'lost'

  return (
    <div
      draggable={draggable}
      onDragStart={(e) => onDragStart?.(e, lead.id)}
      onDragEnd={onDragEnd}
      onClick={() => onOpen(lead.id)}
      className={`rounded-xl border p-3 mb-2 transition-all hover:-translate-y-0.5 ${draggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}`}
      style={{ background: 'var(--qms-surface-card)', borderColor: 'var(--qms-border)' }}
    >
      <div className="text-[13px] font-bold mb-0.5 truncate" style={{ color: 'var(--qms-text)' }}>{lead.title}</div>
      <div className="text-[11px] mb-2 truncate" style={{ color: 'var(--qms-text-muted)' }}>
        {roleLabel(lead.contactPerson)} · {divisionLabel(lead.division)}
      </div>

      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-1.5">
          <UserAvatar firstName={roleLabel(lead.salesPerson)} size="sm" />
          <span className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--qms-text-muted)' }}>
            <FiClock size={10} /> {daysSince(lead.createdAt)}d
          </span>
        </div>
        <span className="text-[13px] font-bold" style={{ color: 'var(--qms-text)' }}>{formatINR(lead.estimatedValue)}</span>
      </div>

      {lead.status === 'won' && (
        <div className="text-center text-[11px] font-bold py-1.5 rounded-lg bg-success-soft text-success">✓ WON</div>
      )}
      {lead.status === 'lost' && (
        <div className="text-center text-[11px] font-bold py-1.5 rounded-lg bg-danger-soft text-danger">✕ LOST</div>
      )}
      {onAdvance && !isFinal && nextStatuses.length > 0 && (
        <div className="flex flex-col gap-1">
          {nextStatuses.map((to) => (
            <button
              key={to}
              onClick={(e) => {
                e.stopPropagation()
                onAdvance(lead.id, to)
              }}
              className="w-full text-[11px] font-semibold py-1.5 rounded-lg border transition-all hover:bg-(--qms-surface-hover)"
              style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-soft)' }}
            >
              Move to {LEAD_STATUS_LABEL[to]} →
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default LeadCard
