import { FiClock } from 'react-icons/fi'
import type { Lead } from '@/types/lead.types'
import { STAGE_ORDER, STAGES } from '@/features/crm/crm.mock'
import { formatINR } from '@/utils/formatters'
import ScoreChip from '@/features/crm/components/ScoreChip'
import UserAvatar from '@/components/ui/UserAvatar'

interface LeadCardProps {
  lead: Lead
  onOpen: (id: string) => void
  onAdvance: (id: string) => void
  draggable?: boolean
  onDragStart?: (e: React.DragEvent, id: string) => void
  onDragEnd?: (e: React.DragEvent) => void
}

const LeadCard = ({ lead, onOpen, onAdvance, draggable, onDragStart, onDragEnd }: LeadCardProps) => {
  const nextIndex = STAGE_ORDER.indexOf(lead.stage) + 1
  const nextStage = nextIndex < STAGE_ORDER.length ? STAGES.find((s) => s.id === STAGE_ORDER[nextIndex]) : null
  const isFinal = lead.stage === 'won' || lead.stage === 'lost'

  return (
    <div
      draggable={draggable}
      onDragStart={(e) => onDragStart?.(e, lead.id)}
      onDragEnd={onDragEnd}
      onClick={() => onOpen(lead.id)}
      className={`rounded-xl border p-3 mb-2 transition-all hover:-translate-y-0.5 ${draggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}`}
      style={{ background: 'var(--qms-surface-card)', borderColor: 'var(--qms-border)' }}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-bold" style={{ color: 'var(--qms-text-muted)' }}>{lead.id}</span>
        <ScoreChip score={lead.score} size="sm" />
      </div>

      <div className="text-[13px] font-bold mb-0.5 truncate" style={{ color: 'var(--qms-text)' }}>{lead.account}</div>
      <div className="text-[11px] mb-2 truncate" style={{ color: 'var(--qms-text-muted)' }}>
        {lead.contact} · {lead.division}
      </div>

      <div className="flex flex-wrap gap-1 mb-2.5">
        {lead.tags.slice(0, 3).map((tag) => (
          <span key={tag} className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' }}>
            {tag}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-1.5">
          <UserAvatar firstName={lead.owner.split(' ')[0]} lastName={lead.owner.split(' ')[1]} tone={lead.ownerTone} size="sm" />
          <span className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--qms-text-muted)' }}>
            <FiClock size={10} /> {lead.age}d
          </span>
        </div>
        <span className="text-[13px] font-bold" style={{ color: 'var(--qms-text)' }}>{formatINR(lead.value)}</span>
      </div>

      {lead.stage === 'won' && (
        <div className="text-center text-[11px] font-bold py-1.5 rounded-lg bg-success-soft text-success">✓ WON</div>
      )}
      {lead.stage === 'lost' && (
        <div className="text-center text-[11px] font-bold py-1.5 rounded-lg bg-danger-soft text-danger">✕ LOSS</div>
      )}
      {!isFinal && nextStage && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onAdvance(lead.id)
          }}
          className="w-full text-[11px] font-semibold py-1.5 rounded-lg border transition-all hover:bg-(--qms-surface-hover)"
          style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-soft)' }}
        >
          Move to {nextStage.name} →
        </button>
      )}
    </div>
  )
}

export default LeadCard
