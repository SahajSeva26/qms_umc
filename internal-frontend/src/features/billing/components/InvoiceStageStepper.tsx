import type { InvoiceStatus } from '@/types/invoice.types'

// The prototype's 4-stage linear stepper (Generated→Approved→GRN→Paid) maps
// onto our real 6-status enum as: draft~Generated, approved~Approved,
// issued~-- (no prototype equivalent, folded into the Approved→GRN gap),
// grn_signed~GRN, paid~Paid. `cancelled` branches off `issued` and isn't a
// linear stage, so it's rendered as its own terminal marker, not a 5th dot.
const STEPS: { status: InvoiceStatus; label: string }[] = [
  { status: 'draft', label: 'Draft' },
  { status: 'approved', label: 'Approved' },
  { status: 'issued', label: 'Issued' },
  { status: 'grn_signed', label: 'GRN' },
  { status: 'paid', label: 'Paid' },
]

interface InvoiceStageStepperProps {
  status: InvoiceStatus
}

const InvoiceStageStepper = ({ status }: InvoiceStageStepperProps) => {
  if (status === 'cancelled') {
    return (
      <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--qms-danger, #ef4444)' }}>
        Cancelled
      </span>
    )
  }

  const curIdx = STEPS.findIndex((s) => s.status === status)

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <div className="flex items-center gap-1.5">
        {STEPS.map((step, i) => {
          const state = i < curIdx ? 'done' : i === curIdx ? 'cur' : 'todo'
          const bg = state === 'done' ? '#10b981' : state === 'cur' ? 'var(--qms-brand)' : 'var(--qms-border)'
          const color = state === 'todo' ? 'var(--qms-text-muted)' : '#fff'
          return (
            <div key={step.status} className="flex items-center gap-1.5">
              <div
                className="flex items-center justify-center rounded-full text-[10px] font-extrabold shrink-0"
                style={{ width: 20, height: 20, background: bg, color }}
                title={step.label}
              >
                {state === 'done' ? '✓' : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className="h-0.5 w-4" style={{ background: i < curIdx ? '#10b981' : 'var(--qms-border)' }} />
              )}
            </div>
          )
        })}
      </div>
      <div className="flex gap-3 ml-1 text-[9px] font-bold uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>
        {STEPS.map((step) => (
          <span key={step.status}>{step.label}</span>
        ))}
      </div>
    </div>
  )
}

export default InvoiceStageStepper
