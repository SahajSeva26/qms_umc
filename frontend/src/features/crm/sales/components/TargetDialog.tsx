import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import type { RepTarget, SalesRep } from '@/types/salesdash.types'
import { QUARTER } from '@/features/crm/sales/sales.mock'
import { targetSchema } from '@/features/crm/sales/schemas'

interface TargetDialogProps {
  open: boolean
  presetRepId?: string | null
  reps: SalesRep[]
  targets: RepTarget[]
  onClose: () => void
  onSave: (repId: string, target: number, rationale: string) => void
}

const TargetDialog = ({ open, presetRepId, reps, targets, onClose, onSave }: TargetDialogProps) => {
  const selectable = reps.filter((r) => !r.relievedOn)
  const [repId, setRepId] = useState('')
  const [target, setTarget] = useState('')
  const [rationale, setRationale] = useState('')
  const [error, setError] = useState<string | null>(null)

  const prefill = (nextRepId: string) => {
    const existing = targets.find((t) => t.repId === nextRepId && t.quarter === QUARTER)
    setRepId(nextRepId)
    setTarget(existing ? String(existing.target) : '')
    setRationale(existing?.rationale ?? '')
    setError(null)
  }

  useEffect(() => {
    if (open) prefill(presetRepId ?? selectable[0]?.id ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, presetRepId])

  const handleSave = () => {
    const result = targetSchema.safeParse({ repId, target, rationale })
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Fill all required fields.')
      return
    }
    onSave(result.data.repId, result.data.target, result.data.rationale)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="text-sm font-bold" style={{ color: 'var(--qms-text)' }}>
            Set quarterly target · {QUARTER}
          </DialogTitle>
        </DialogHeader>

        <div>
          <Label className="block text-[10px] font-semibold tracking-widest uppercase mb-1.5" style={{ color: 'var(--qms-text-muted)' }}>
            Sales person *
          </Label>
          <Select value={repId || 'ALL'} onValueChange={(v) => prefill((v as string) === 'ALL' ? '' : (v as string))}>
            <SelectTrigger className="w-full text-[13px]"><SelectValue placeholder="Pick a sales person" /></SelectTrigger>
            <SelectContent>
              {selectable.map((r) => (
                <SelectItem key={r.id} value={r.id}>{r.name} · {r.role === 'Sales Head' ? 'Head' : 'KAM'}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="block text-[10px] font-semibold tracking-widest uppercase mb-1.5" style={{ color: 'var(--qms-text-muted)' }}>
            Target amount (₹) *
          </Label>
          <Input
            type="number"
            min={0}
            value={target}
            onChange={(e) => { setTarget(e.target.value); setError(null) }}
            placeholder="e.g. 12000000"
            className="text-[13px]"
          />
        </div>

        <div>
          <Label className="block text-[10px] font-semibold tracking-widest uppercase mb-1.5" style={{ color: 'var(--qms-text-muted)' }}>
            Rationale * <span className="normal-case tracking-normal font-normal">(min 30 chars — why this number)</span>
          </Label>
          <Textarea
            value={rationale}
            onChange={(e) => { setRationale(e.target.value); setError(null) }}
            rows={3}
            placeholder="Territory potential, anchor accounts, conversion history..."
            className="text-[13px]"
            aria-invalid={!!error}
          />
          {error && <p className="text-[11px] mt-1 text-danger">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save target</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default TargetDialog
