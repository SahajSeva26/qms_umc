import type { LeadEntity, LeadStatus } from '@/types/crm.types'
import { LEAD_STATUS_LABEL, LEAD_STATUS_COLOR } from '@/types/crm.types'
import { roleLabel, divisionLabel } from '@/features/crm/crm.utils'
import SideDrawer from '@/components/ui/SideDrawer'
import { Button } from '@/components/ui/button'
import { formatINR } from '@/utils/formatters'

interface StageDrawerProps {
  status: LeadStatus | null
  leads: LeadEntity[]
  onClose: () => void
  onOpenLead: (id: string) => void
  onNewLead: () => void
  canManage: boolean
}

const StageDrawer = ({ status, leads, onClose, onOpenLead, onNewLead, canManage }: StageDrawerProps) => {
  if (!status) return <SideDrawer open={false} title="" onClose={onClose}>{null}</SideDrawer>

  const color = LEAD_STATUS_COLOR[status]
  const statusLeads = [...leads].filter((l) => l.status === status).sort((a, b) => b.estimatedValue - a.estimatedValue)
  const total = statusLeads.reduce((sum, l) => sum + l.estimatedValue, 0)
  const avgValue = statusLeads.length > 0 ? Math.round(total / statusLeads.length) : 0

  return (
    <SideDrawer open title={LEAD_STATUS_LABEL[status]} onClose={onClose} widthClassName="max-w-xl">
      <div
        className="rounded-xl border p-3 mb-4"
        style={{ borderColor: 'var(--qms-border)', background: `${color}10` }}
      >
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
          <span className="text-[13px] font-bold" style={{ color: 'var(--qms-text)' }}>{LEAD_STATUS_LABEL[status]}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 mb-4">
        {[
          { label: 'Leads', value: String(statusLeads.length), sub: 'in this stage' },
          { label: 'Total value', value: formatINR(total), sub: 'cumulative' },
          { label: 'Avg value', value: formatINR(avgValue), sub: 'per lead' },
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
        {statusLeads.map((lead) => (
          <button
            key={lead.id}
            onClick={() => onOpenLead(lead.id)}
            className="w-full text-left rounded-lg p-2.5 transition-colors hover:bg-(--qms-surface-hover)"
            style={{ background: 'var(--qms-surface-strong)' }}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[12px] font-bold truncate" style={{ color: 'var(--qms-text)' }}>{lead.title}</div>
                <div className="text-[11px] truncate" style={{ color: 'var(--qms-text-muted)' }}>
                  {roleLabel(lead.contactPerson)} · {divisionLabel(lead.division)}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[12px] font-bold" style={{ color: 'var(--qms-text)' }}>{formatINR(lead.estimatedValue)}</span>
              </div>
            </div>
          </button>
        ))}
        {statusLeads.length === 0 && (
          <p className="text-[13px] py-4 text-center" style={{ color: 'var(--qms-text-muted)' }}>No leads in this stage.</p>
        )}
      </div>

      {canManage && <Button className="w-full" onClick={onNewLead}>+ New lead</Button>}
    </SideDrawer>
  )
}

export default StageDrawer
