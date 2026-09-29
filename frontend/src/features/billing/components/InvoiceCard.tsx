import { FiEye } from 'react-icons/fi'
import type { InvoiceEntity } from '@/types/invoice.types'
import { formatDate, formatINRFull } from '@/utils/formatters'
import InvoiceStatusPill from '@/features/billing/components/InvoiceStatusPill'
import InvoiceStageStepper from '@/features/billing/components/InvoiceStageStepper'
import { Button } from '@/components/ui/button'

interface InvoiceCardProps {
  invoice: InvoiceEntity
  onOpenDetail: (id: string) => void
  onChangeStatus: (id: string) => void
  canMoveStage: boolean
}

// search() always populates `project` — only create()/update()/moveStage()
// echo back a bare id string instead (see invoice.types.ts).
const projectLabel = (invoice: InvoiceEntity) =>
  typeof invoice.project === 'string' ? invoice.project : `${invoice.project.name} (${invoice.project.code})`

// Real Invoice model has no paymentStatus field (unlike the prototype) — this
// is honestly re-derived from status alone: paid = cleared, everything else
// non-cancelled = outstanding, same rule InvoicePipelineKpiStrip already uses.
const isPaymentCleared = (status: InvoiceEntity['status']) => status === 'paid'
const isPaymentTracked = (status: InvoiceEntity['status']) => status !== 'cancelled'

// Matches the prototype's stacked invoice card (crm-invoicing.js:404-426):
// header row (code/status/payment chip, total+date), inline stepper, action row.
const InvoiceCard = ({ invoice, onOpenDetail, onChangeStatus, canMoveStage }: InvoiceCardProps) => (
  <div className="rounded-xl border p-3.5 mb-2.5" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}>
    <div className="flex items-start justify-between gap-3 flex-wrap">
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-extrabold text-[14px]" style={{ color: 'var(--qms-text)' }}>{invoice.code}</span>
          <InvoiceStatusPill status={invoice.status} />
          {isPaymentTracked(invoice.status) && (
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
              style={{
                background: isPaymentCleared(invoice.status) ? 'rgba(16,185,129,.14)' : 'rgba(244,63,94,.14)',
                color: isPaymentCleared(invoice.status) ? '#047857' : '#b91c1c',
              }}
            >
              {isPaymentCleared(invoice.status) ? 'Payment cleared' : 'Payment outstanding'}
            </span>
          )}
        </div>
        <div className="text-[12px] mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>{projectLabel(invoice)}</div>
      </div>
      <div className="text-right shrink-0">
        <div className="font-extrabold text-[16px]" style={{ color: 'var(--qms-text)' }}>{formatINRFull(invoice.total)}</div>
        <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{formatDate(invoice.issueDate)}</div>
      </div>
    </div>

    <div className="my-2.5">
      <InvoiceStageStepper status={invoice.status} />
    </div>

    <div className="flex items-center gap-2 flex-wrap">
      <Button variant="outline" size="sm" onClick={() => onOpenDetail(invoice.id)}>
        <FiEye size={13} /> Detail
      </Button>
      {canMoveStage && (
        <Button variant="outline" size="sm" onClick={() => onChangeStatus(invoice.id)}>
          Change status
        </Button>
      )}
    </div>
  </div>
)

export default InvoiceCard
