import { useMemo, useState } from 'react'
import { FiAlertTriangle, FiCheckCircle, FiXCircle } from 'react-icons/fi'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { toast } from '@/components/ui/sonner'
import { SLOTS } from '@/features/camps/camps.mock'
import type { Camp, CampCancellation } from '@/types/camp.types'
import type { ProjectEntity } from '@/types/project.types'

interface CancelCampModalProps {
  open: boolean
  onClose: () => void
  camp: Camp
  project?: ProjectEntity
}

const REASON_OPTIONS: { value: CampCancellation['reason']; label: string }[] = [
  { value: 'DOCTOR_UNAVAILABLE', label: 'Doctor unavailable' },
  { value: 'WEATHER', label: 'Weather' },
  { value: 'LOW_TURNOUT', label: 'Low turnout expected' },
  { value: 'CLIENT_REQUEST', label: 'Client request' },
  { value: 'RESCHEDULED', label: 'Rescheduled' },
  { value: 'OTHER', label: 'Other' },
]

// Mirrors camps-manager.js's defaultPolicy() (line 279-281) — used whenever
// the camp has no linked project, or the project carries no cancellationPolicy.
const DEFAULT_POLICY = { freeHoursPrior: 24, pctAllowed: 100, pctDeducted: 50 }

// Mirrors camps-manager.js's hoursUntilCamp() (line 267-273): resolves the
// slot's start hour from its id (leading digits), builds a Date at that hour
// on the camp's date, and diffs against now in hours.
function hoursUntilCamp(camp: Camp): number {
  const slot = SLOTS.find((s) => s.id === camp.slot)
  const match = slot?.id.match(/^(\d+)/)
  const startHr = match ? parseInt(match[1], 10) : 10
  const dt = new Date(`${camp.date}T${String(startHr).padStart(2, '0')}:00:00`)
  return (dt.getTime() - Date.now()) / 3_600_000
}

// Mirrors camps-manager.js's computeCancellationCharge() (line 282-297).
// Real backend Project has no nested cancellationPolicy object — 3 flat
// fields instead (freeCancelHours/cancellationAllowed/
// campCostDeductionOnChargableCancel).
function computeCancellationCharge(camp: Camp, project?: ProjectEntity) {
  const policy = project
    ? { freeHoursPrior: project.freeCancelHours, pctAllowed: project.cancellationAllowed, pctDeducted: project.campCostDeductionOnChargableCancel }
    : DEFAULT_POLICY
  const hrs = hoursUntilCamp(camp)
  const unitCost = project?.campCost || 5000
  const isFree = hrs >= policy.freeHoursPrior
  const chargeAmount = isFree ? 0 : Math.round(unitCost * (policy.pctDeducted / 100))
  return {
    policy,
    hoursUntilCamp: hrs,
    unitCost,
    isFree,
    chargeAmount,
    newStatus: isFree ? ('CANCELLED' as const) : ('CANCELLED_CHARGED' as const),
  }
}

const CancelCampModal = ({ open, onClose, camp, project }: CancelCampModalProps) => {
  const [reason, setReason] = useState<CampCancellation['reason']>('DOCTOR_UNAVAILABLE')
  const [notes, setNotes] = useState('')

  const calc = useMemo(() => computeCancellationCharge(camp, project), [camp, project])

  const slotLabel = SLOTS.find((s) => s.id === camp.slot)?.label || camp.slot
  const hoursRounded = Math.round(calc.hoursUntilCamp)
  const policyMsg = calc.isFree
    ? `Free cancellation — ${hoursRounded}h before slot (policy: ≥ ${calc.policy.freeHoursPrior}h).`
    : `Late cancellation — only ${hoursRounded}h before slot (policy: ≥ ${calc.policy.freeHoursPrior}h free).`

  const handleConfirm = () => {
    toast.success(
      `UI only — would cancel ${camp.id}${calc.isFree ? '' : ` · ₹${calc.chargeAmount.toLocaleString('en-IN')} charge`} · reason: ${reason}`
    )
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Cancel camp</DialogTitle>
        </DialogHeader>

        <div className="text-[13px] space-y-4">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            <div style={{ color: 'var(--qms-text-muted)' }}>Camp</div>
            <div className="font-semibold" style={{ color: 'var(--qms-text)' }}>{camp.id} · {camp.type}</div>
            <div style={{ color: 'var(--qms-text-muted)' }}>Date / slot</div>
            <div className="font-semibold" style={{ color: 'var(--qms-text)' }}>{camp.date} · {slotLabel}</div>
            <div style={{ color: 'var(--qms-text-muted)' }}>Project</div>
            <div className="font-semibold" style={{ color: 'var(--qms-text)' }}>{project?.id || '— standalone —'}</div>
          </div>

          <div
            className="rounded-xl border p-3 space-y-2"
            style={{
              borderColor: calc.isFree ? 'var(--success)' : 'var(--danger)',
              background: calc.isFree ? 'var(--success-soft)' : 'var(--danger-soft)',
            }}
          >
            <div className="flex items-center gap-2 font-bold" style={{ color: calc.isFree ? 'var(--success)' : 'var(--danger)' }}>
              {calc.isFree ? <FiCheckCircle size={14} /> : <FiAlertTriangle size={14} />}
              {policyMsg}
            </div>
            <div className="flex items-center justify-between">
              <span style={{ color: 'var(--qms-text-muted)' }}>Free-cancellation window</span>
              <span className="font-semibold" style={{ color: 'var(--qms-text)' }}>≥ {calc.policy.freeHoursPrior}h before slot</span>
            </div>
            <div className="flex items-center justify-between">
              <span style={{ color: 'var(--qms-text-muted)' }}>Time until slot</span>
              <span className="font-semibold" style={{ color: 'var(--qms-text)' }}>{hoursRounded}h</span>
            </div>
            <div className="flex items-center justify-between">
              <span style={{ color: 'var(--qms-text-muted)' }}>Camp unit cost (estimate)</span>
              <span className="font-semibold" style={{ color: 'var(--qms-text)' }}>₹{calc.unitCost.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex items-center justify-between">
              <span style={{ color: 'var(--qms-text-muted)' }}>Charge on late cancellation</span>
              <span className="font-semibold" style={{ color: 'var(--qms-text)' }}>{calc.policy.pctDeducted}%</span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t" style={{ borderColor: 'var(--qms-border)' }}>
              <span style={{ color: 'var(--qms-text-muted)' }}>Final charge</span>
              <span className="text-base font-extrabold" style={{ color: calc.isFree ? 'var(--success)' : 'var(--danger)' }}>
                {calc.isFree ? 'FREE' : `₹${calc.chargeAmount.toLocaleString('en-IN')}`}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wide mb-1" style={{ color: 'var(--qms-text-muted)' }}>
              Reason for cancellation
            </label>
            <Select value={reason} onValueChange={(v) => v && setReason(v as CampCancellation['reason'])}>
              <SelectTrigger className="w-full text-[13px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {REASON_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wide mb-1" style={{ color: 'var(--qms-text-muted)' }}>
              Notes (visible in audit log)
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Brief reason — sent to client + audit log"
              className="text-[13px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Keep camp</Button>
          <Button
            onClick={handleConfirm}
            className={calc.isFree ? 'text-white' : 'bg-danger-soft text-danger hover:bg-danger-soft/80'}
            style={calc.isFree ? { background: 'var(--qms-brand)' } : undefined}
          >
            <FiXCircle size={14} />
            {calc.isFree ? 'Confirm cancellation (free)' : `Confirm cancellation · ₹${calc.chargeAmount.toLocaleString('en-IN')} charge`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default CancelCampModal
