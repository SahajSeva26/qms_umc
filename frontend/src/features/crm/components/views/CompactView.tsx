import type { Lead } from '@/types/lead.types'
import { STAGES } from '@/features/crm/crm.mock'
import { formatINR } from '@/utils/formatters'

interface CompactViewProps {
  leads: Lead[]
  onSelectStage: (stageId: string) => void
}

const CompactView = ({ leads, onSelectStage }: CompactViewProps) => (
  <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
    {STAGES.map((stage) => {
      const stageLeads = leads.filter((l) => l.stage === stage.id)
      const total = stageLeads.reduce((sum, l) => sum + l.value, 0)
      const avgScore = stageLeads.length > 0 ? Math.round(stageLeads.reduce((s, l) => s + l.score, 0) / stageLeads.length) : 0

      return (
        <button
          key={stage.id}
          onClick={() => onSelectStage(stage.id)}
          className="text-left rounded-2xl border p-4 transition-all hover:-translate-y-0.5"
          style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: stage.color }} />
            <span className="text-[13px] font-bold" style={{ color: 'var(--qms-text)' }}>{stage.name}</span>
          </div>
          <div className="text-2xl font-extrabold mb-1" style={{ color: 'var(--qms-text)' }}>{stageLeads.length}</div>
          <div className="text-[12px] mb-2" style={{ color: 'var(--qms-text-muted)' }}>{formatINR(total)}</div>
          <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>Avg score {avgScore}</div>
        </button>
      )
    })}
  </div>
)

export default CompactView
