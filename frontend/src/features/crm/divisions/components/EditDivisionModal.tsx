import { useState } from 'react'
import { FiSave } from 'react-icons/fi'
import type { DivisionEntity, DivisionStatus, DivisionTherapy } from '@/types/crm.types'
import { DIVISION_THERAPY_LABEL } from '@/types/crm.types'
import { updateDivisionSchema } from '@/features/crm/divisions/schemas/division.schemas'
import { useUpdateDivision } from '@/features/crm/divisions/hooks/useUpdateDivision'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { toast } from '@/components/ui/sonner'

interface EditDivisionModalProps {
  division: DivisionEntity
  onClose: () => void
}

const THERAPY_OPTIONS = Object.keys(DIVISION_THERAPY_LABEL) as DivisionTherapy[]
const STATUS_OPTIONS: { value: DivisionStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]

// Edit-only surface for an existing division — matches
// UpdateDivisionPayloadSchema exactly: name/therapy/brandFocus/mrCount/status.
// No Code/Company/Head/Owner fields here, none of which the backend allows to
// change post-creation (division.validators.ts's UpdateDivisionPayloadSchema
// never even accepts those keys). Status is always shown here regardless of
// canSeeInactive on the list page — a caller can only ever open this modal by
// clicking a row they already fetched, and division.service.ts's update()
// applies whatever status is sent without a separate manage-only gate on the
// update path itself (only search()'s default-to-active is gated).
const EditDivisionModal = ({ division, onClose }: EditDivisionModalProps) => {
  const [name, setName] = useState(division.name)
  const [therapy, setTherapy] = useState<DivisionTherapy>(division.therapy)
  const [brandFocus, setBrandFocus] = useState(division.brandFocus ?? '')
  const [mrCount, setMrCount] = useState(division.mrCount ?? 0)
  const [status, setStatus] = useState<DivisionStatus>(division.status ?? 'active')
  const [error, setError] = useState<string | null>(null)

  const updateDivision = useUpdateDivision(division.id)

  const handleSave = async () => {
    const result = updateDivisionSchema.safeParse({
      name,
      therapy,
      brandFocus: brandFocus || undefined,
      mrCount,
      status,
    })
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Please complete the required fields.')
      return
    }
    setError(null)

    try {
      await updateDivision.mutateAsync(result.data)
      toast.success('Division updated')
      onClose()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not update the division — try again.')
    }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="text-sm font-bold" style={{ color: 'var(--qms-text)' }}>
            Edit division <span className="font-mono font-normal" style={{ color: 'var(--qms-text-muted)' }}>({division.code})</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="block text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
              Name *
            </Label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-[13px]"
            />
          </div>

          <div>
            <Label className="block text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
              Therapy area *
            </Label>
            <Select value={therapy} onValueChange={(v) => setTherapy(v as DivisionTherapy)}>
              <SelectTrigger className="w-full text-[13px]">
                <SelectValue placeholder="Select therapy area...">
                  {(v: string) => DIVISION_THERAPY_LABEL[v as DivisionTherapy] ?? 'Select therapy area...'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {THERAPY_OPTIONS.map((t) => <SelectItem key={t} value={t}>{DIVISION_THERAPY_LABEL[t]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <Label className="block text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
                Brand focus
              </Label>
              <Input
                type="text"
                value={brandFocus}
                onChange={(e) => setBrandFocus(e.target.value)}
                className="text-[13px]"
              />
            </div>
            <div>
              <Label className="block text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
                MR count
              </Label>
              <Input
                type="number"
                value={mrCount || ''}
                onChange={(e) => setMrCount(Number(e.target.value))}
                className="text-[13px]"
              />
            </div>
          </div>

          <div>
            <Label className="block text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
              Status *
            </Label>
            <Select value={status} onValueChange={(v) => setStatus(v as DivisionStatus)}>
              <SelectTrigger className="w-full text-[13px]">
                <SelectValue>{(v: string) => STATUS_OPTIONS.find((s) => s.value === v)?.label ?? 'Status'}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {error && <p className="text-[12px] text-danger">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={updateDivision.isPending} className="font-bold text-white" style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}>
            <FiSave size={14} /> {updateDivision.isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default EditDivisionModal
