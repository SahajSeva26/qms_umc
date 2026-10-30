import type { InvoiceStatus } from '@/types/invoice.types'

// The prototype's four visible milestones map onto the real backend workflow.
// `issued` is an intermediate backend state between Approved and GRN, so it
// remains on the Approved milestone rather than inventing a fifth UI stage.
const STEPS = ['Generated', 'Approved', 'GRN', 'Paid'] as const

const STATUS_STAGE: Record<Exclude<InvoiceStatus, 'cancelled'>, number> = {
  draft: 0,
  approved: 1,
  issued: 1,
  grn_signed: 2,
  paid: 3,
}

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

  const curIdx = STATUS_STAGE[status]
  const progress = (curIdx / (STEPS.length - 1)) * 100

  return (
    <div className="flex w-full items-center gap-3" aria-label="Invoice progress">
      <div className="relative flex min-w-0 flex-1 items-center justify-between">
        <div
          aria-hidden="true"
          className="absolute left-2.5 right-2.5 top-1/2 h-0.5 -translate-y-1/2"
          style={{ background: 'var(--qms-border)' }}
        />
        <div
          aria-hidden="true"
          className="absolute left-2.5 top-1/2 h-0.5 -translate-y-1/2"
          style={{ background: '#10b981', width: `calc((100% - 20px) * ${progress / 100})` }}
        />
        {STEPS.map((label, i) => {
          const state = i < curIdx ? 'done' : i === curIdx ? 'cur' : 'todo'
          const bg = state === 'done' ? '#10b981' : state === 'cur' ? 'var(--qms-brand)' : 'var(--qms-border)'
          const color = state === 'todo' ? 'var(--qms-text-muted)' : '#fff'
          return (
            <div
              key={label}
              className="relative z-10 flex"
            >
              <div
                className="flex items-center justify-center rounded-full text-[10px] font-extrabold shrink-0"
                style={{ width: 20, height: 20, background: bg, color }}
                aria-label={`${label} stage`}
                aria-current={state === 'cur' ? 'step' : undefined}
              >
                {i + 1}
              </div>
            </div>
          )
        })}
      </div>
      <div
        className="flex shrink-0 items-center gap-3 text-[9px] font-bold uppercase tracking-wide"
        style={{ color: 'var(--qms-text-muted)' }}
        aria-label="Invoice stage labels"
      >
        {STEPS.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
    </div>
  )
}

export default InvoiceStageStepper
