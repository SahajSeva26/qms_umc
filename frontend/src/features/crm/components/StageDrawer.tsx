import type { Lead, StageMeta } from '@/types/lead.types'
import SideDrawer from '@/components/ui/SideDrawer'
import ScoreChip from '@/features/crm/components/ScoreChip'
import { Button } from '@/components/ui/button'
import { formatINR } from '@/utils/formatters'

interface StageDrawerProps {
  stage: StageMeta | null
  leads: Lead[]
  onClose: () => void
  onOpenLead: (id: string) => void
  onNewLead: () => void
}

// Mirrors the prototype's openStageDrawer(): per-stage KPIs (count/total/avg
// value/avg score), a value-sorted lead list, and a "New lead" shortcut.
const StageDrawer = ({ stage, leads, onClose, onOpenLead, onNewLead }: StageDrawerProps) => {
  if (!stage) return <SideDrawer open={false} title="" onClose={onClose}>{null}</SideDrawer>

  const stageLeads = [...leads].filter((l) => l.stage === stage.id).sort((a, b) => b.value - a.value)
  const total = stageLeads.reduce((sum, l) => sum + l.value, 0)
  const avgValue = stageLeads.length > 0 ? Math.round(total / stageLeads.length) : 0
  const avgScore = stageLeads.length > 0 ? Math.round(stageLeads.reduce((s, l) => s + l.score, 0) / stageLeads.length) : 0

  return (
    <SideDrawer open title={stage.name} onClose={onClose} widthClassName="max-w-xl">
      <div
        className="rounded-xl border p-3 mb-4"
        style={{ borderColor: 'var(--qms-border)', background: `${stage.color}10` }}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: stage.color }} />
          <span className="text-[13px] font-bold" style={{ color: 'var(--qms-text)' }}>{stage.name}</span>
        </div>
        <p className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>{stage.desc}</p>
      </div>

      <div className="grid grid-cols-2 gap-2.5 mb-4">
        {[
          { label: 'Leads', value: String(stageLeads.length), sub: 'in this stage' },
          { label: 'Total value', value: formatINR(total), sub: 'cumulative' },
          { label: 'Avg value', value: formatINR(avgValue), sub: 'per lead' },
          { label: 'Avg score', value: String(avgScore), sub: 'AI rating' },
        ].map((tile) => (
          <div
            key={tile.label}
            className="rounded-xl border p-3"
            style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-strong)' }}
          >
            <div className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--qms-text-muted)' }}>
              {tile.label}
            </div>
            <div className="text-lg font-extrabold" style={{ color: 'var(--qms-text)' }}>{tile.value}</div>
            <div className="text-[10px] mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>{tile.sub}</div>
          </div>
        ))}
      </div>

      <h3 className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--qms-text-muted)' }}>
        Leads in this stage
      </h3>
      <div className="space-y-2 mb-4">
        {stageLeads.map((lead) => (
          <button
            key={lead.id}
            onClick={() => onOpenLead(lead.id)}
            className="w-full text-left rounded-lg p-2.5 transition-colors hover:bg-(--qms-surface-hover)"
            style={{ background: 'var(--qms-surface-strong)' }}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[12px] font-bold truncate" style={{ color: 'var(--qms-text)' }}>{lead.account}</div>
                <div className="text-[11px] truncate" style={{ color: 'var(--qms-text-muted)' }}>
                  {lead.contact} · {lead.therapy} · {lead.geography}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[12px] font-bold" style={{ color: 'var(--qms-text)' }}>{formatINR(lead.value)}</span>
                <ScoreChip score={lead.score} size="sm" />
                <span className="text-[10px]" style={{ color: 'var(--qms-text-muted)' }}>{lead.age}d</span>
              </div>
            </div>
          </button>
        ))}
        {stageLeads.length === 0 && (
          <p className="text-[13px] py-4 text-center" style={{ color: 'var(--qms-text-muted)' }}>No leads in this stage.</p>
        )}
      </div>

      <Button className="w-full" onClick={onNewLead}>+ New lead</Button>
    </SideDrawer>
  )
}

export default StageDrawer
