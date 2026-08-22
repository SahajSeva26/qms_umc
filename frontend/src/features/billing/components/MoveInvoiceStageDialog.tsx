import { useRef, useState } from 'react'
import type { InvoiceEntity, InvoiceStatus } from '@/types/invoice.types'
import { INVOICE_TRANSITION_MAP, INVOICE_STATUS_LABEL } from '@/types/invoice.types'
import { useMoveInvoiceStage } from '@/features/billing/hooks/useMoveInvoiceStage'
import { moveInvoiceStageSchema } from '@/features/billing/schemas/invoice.schemas'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'

interface MoveInvoiceStageDialogProps {
  invoice: InvoiceEntity
  // Line count at the parent invoice — an empty draft shouldn't be
  // approvable, so 'approved' is excluded from the offered targets at zero.
  lineItemCount: number
  onClose: () => void
}

// Backed by the single generic PATCH /invoices/:id/stage endpoint. draft →
// approved gets an extra, stronger warning below — it's one-way and
// permanently locks line-item editing, unlike every other transition here.
const MoveInvoiceStageDialog = ({ invoice, lineItemCount, onClose }: MoveInvoiceStageDialogProps) => {
  const legalTargets = INVOICE_TRANSITION_MAP[invoice.status].filter(
    (target) => target !== 'approved' || lineItemCount > 0,
  )
  const [status, setStatus] = useState<InvoiceStatus | ''>(legalTargets[0] ?? '')
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const moveStage = useMoveInvoiceStage()
  // Synchronous guard against a fast double-click firing two overlapping
  // stage moves before React re-renders moveStage.isPending onto the button.
  const submittingRef = useRef(false)

  const handleSave = async () => {
    if (submittingRef.current) return
    const result = moveInvoiceStageSchema.safeParse({ reason })
    if (!result.success || !status) {
      setError(result.success ? 'Select a status.' : result.error.issues[0]?.message ?? 'Please complete the required fields.')
      return
    }
    setError(null)
    submittingRef.current = true
    try {
      await moveStage.mutateAsync({ id: invoice.id, payload: { to: status, reason } })
      onClose()
    } catch {
      // no-op: useMoveInvoiceStage's onError already toasted
      submittingRef.current = false
    }
  }

  if (legalTargets.length === 0) {
    return (
      <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold" style={{ color: 'var(--qms-text)' }}>Change status · {invoice.code}</DialogTitle>
          </DialogHeader>
          <p className="text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>
            {invoice.status === 'draft' && lineItemCount === 0
              ? 'Add at least one camp before this draft can be approved.'
              : `This invoice is ${INVOICE_STATUS_LABEL[invoice.status].toLowerCase()} — a terminal status with no further transitions.`}
          </p>
          <div className="flex justify-end mt-2">
            <Button variant="secondary" onClick={onClose}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // onOpenChange fires for Escape, backdrop-click, AND the Cancel button —
  // it must check submittingRef.current (set synchronously the instant
  // handleSave starts), not moveStage.isPending. isPending only updates on
  // React's NEXT render after mutateAsync begins; in the tiny window
  // between the mutation starting and that render committing, isPending is
  // still stale-false, so a dismissal attempt in that window would have
  // closed the dialog while the stage move was still genuinely in flight.
  // The Cancel button's visible `disabled` styling below still uses
  // isPending — that's a rendered prop, so it only needs to be correct once
  // React has actually re-rendered, unlike the dismissal guard here.
  return (
    <Dialog open onOpenChange={(o) => { if (!o && !submittingRef.current) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold" style={{ color: 'var(--qms-text)' }}>Change status · {invoice.code}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="block text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>New status *</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as InvoiceStatus)}>
              <SelectTrigger className="w-full text-[13px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {legalTargets.map((s) => (
                  <SelectItem key={s} value={s}>{INVOICE_STATUS_LABEL[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {status === 'approved' && (
            <div className="text-[12px] rounded-lg px-3 py-2 bg-danger-soft border border-danger text-danger font-semibold">
              This cannot be undone — once approved, line items on this invoice can no longer be added or removed.
            </div>
          )}

          <div>
            <Label className="block text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>Reason *</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="text-[13px]" placeholder="Why is the status changing?" />
          </div>
          {error && <p className="text-[12px] text-danger">{error}</p>}
        </div>
        <div className="flex gap-2 justify-end mt-2">
          {/* Same submittingRef.current guard as onOpenChange above — this
              is a separate click handler, not routed through onOpenChange,
              so without this check it could still close in the tiny window
              between handleSave starting and moveStage.isPending's next
              render actually reflecting it. */}
          <Button variant="secondary" onClick={() => { if (!submittingRef.current) onClose() }} disabled={moveStage.isPending}>Cancel</Button>
          <Button onClick={handleSave} disabled={moveStage.isPending} className="font-bold text-white" style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}>
            {moveStage.isPending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default MoveInvoiceStageDialog
