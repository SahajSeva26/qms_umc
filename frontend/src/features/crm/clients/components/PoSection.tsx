import { FiFileText } from 'react-icons/fi'
import type { ClientProject, PurchaseOrder } from '@/types/client.types'
import { Button } from '@/components/ui/button'
import { formatDate, formatINR } from '@/utils/formatters'
import { allocatePoExecution, CONFIRMATION_TYPE_COLORS, PO_STATUS_COLORS } from '@/features/crm/clients/clients.utils'

interface PoSectionProps {
  projects: ClientProject[]
  onAdd: () => void
  onModify: (projectId: string, po: PurchaseOrder) => void
}

interface PoRow {
  project: ClientProject
  po: PurchaseOrder
  executed: number
}

const PoSection = ({ projects, onAdd, onModify }: PoSectionProps) => {
  const rows: PoRow[] = projects
    .flatMap((project) => {
      const executed = allocatePoExecution(project)
      return project.pos.map((po) => ({ project, po, executed: executed[po.id] ?? 0 }))
    })
    .sort((a, b) => a.po.poDate.localeCompare(b.po.poDate))

  return (
    <section className="mb-6">
      <div className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--qms-text-muted)' }}>
        Purchase Orders
      </div>

      {rows.length === 0 ? (
        <div
          className="rounded-xl border border-dashed p-6 flex flex-col items-center gap-2 text-center"
          style={{ borderColor: 'var(--qms-border)' }}
        >
          <FiFileText size={18} style={{ color: 'var(--qms-text-muted)' }} />
          <p className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>
            No purchase orders yet for this division.
          </p>
          <Button size="sm" variant="outline" onClick={onAdd}>Add PO</Button>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map(({ project, po, executed }) => {
            const pct = po.campCount > 0 ? Math.min(100, Math.round((executed / po.campCount) * 100)) : 0
            const typeColor = CONFIRMATION_TYPE_COLORS[po.confirmationType]
            return (
              <div
                key={po.id}
                className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border p-3"
                style={{ background: 'var(--qms-surface-card)', borderColor: 'var(--qms-border)' }}
              >
                <div className="flex-1 min-w-48">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13px] font-bold" style={{ color: 'var(--qms-text)' }}>{po.poNo}</span>
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: `${typeColor}22`, color: typeColor }}
                    >
                      {po.confirmationType}
                    </span>
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: `${PO_STATUS_COLORS[po.status]}22`, color: PO_STATUS_COLORS[po.status] }}
                    >
                      {po.status}
                    </span>
                  </div>
                  <div className="text-[11px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>
                    {project.name} · {formatDate(po.poDate)}
                    {po.poExpiry ? ` → ${formatDate(po.poExpiry)}` : ''}
                  </div>
                </div>

                <span className="flex flex-col items-end w-20">
                  <span className="text-[13px] font-bold tabular-nums" style={{ color: 'var(--qms-text)' }}>{formatINR(po.value)}</span>
                  <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: 'var(--qms-text-muted)' }}>Value</span>
                </span>
                <span className="flex flex-col items-end w-14">
                  <span className="text-[13px] font-bold tabular-nums" style={{ color: 'var(--qms-text)' }}>{po.campCount}</span>
                  <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: 'var(--qms-text-muted)' }}>Camps</span>
                </span>

                {/* Execution = project.campsDone allocated across POs in poDate order */}
                <div className="w-32">
                  <div className="flex items-center justify-between text-[10px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>
                    <span>Execution</span>
                    <span className="tabular-nums">{executed}/{po.campCount}</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--qms-surface-strong)' }}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'var(--qms-teal)' }} />
                  </div>
                </div>

                <Button size="xs" variant="outline" onClick={() => onModify(project.id, po)}>Modify</Button>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

export default PoSection
