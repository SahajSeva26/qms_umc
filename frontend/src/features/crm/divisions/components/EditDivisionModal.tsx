import { useState } from 'react'
import type { DivisionEntity, DivisionStatus, DivisionTherapy } from '@/features/crm/crm.types'
import { DIVISION_THERAPY_LABEL } from '@/features/crm/crm.types'
import { useUpdateDivision } from '@/features/crm/divisions/hooks/useUpdateDivision'
import { updateDivisionSchema } from '@/features/crm/divisions/schemas/division.schemas'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import ChipPicker from '@/components/ui/ChipPicker'

const THERAPY_OPTIONS = Object.keys(DIVISION_THERAPY_LABEL) as DivisionTherapy[]
const STATUS_OPTIONS: { value: DivisionStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]

interface EditDivisionModalProps {
  division: DivisionEntity
  onClose: () => void
}

// Same shape as EditTenantModal.tsx — no Code/Company/Head/Owner fields,
// the backend doesn't allow changing those post-creation.
const EditDivisionModal = ({ division, onClose }: EditDivisionModalProps) => {
  const updateDivision = useUpdateDivision(division.id)
  const [name, setName] = useState(division.name)
  const [therapy, setTherapy] = useState<DivisionTherapy[]>(division.therapy)
  const [brandFocus, setBrandFocus] = useState(division.brandFocus ?? '')
  const [mrCount, setMrCount] = useState(division.mrCount ?? 0)
  const [status, setStatus] = useState<DivisionStatus | ''>(division.status ?? '')
  const [formError, setFormError] = useState<string | null>(null)

  const handleSave = () => {
    const result = updateDivisionSchema.safeParse({
      name,
      therapy,
      brandFocus: brandFocus || undefined,
      mrCount,
      status: status || undefined,
    })
    if (!result.success) {
      setFormError(result.error.issues[0]?.message ?? 'Please complete the required fields.')
      return
    }
    setFormError(null)
    updateDivision.mutate(result.data, { onSuccess: onClose })
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="text-sm font-bold" style={{ color: 'var(--qms-text)' }}>Edit division</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
              Name *
            </Label>
            <Input type="text" value={name} onChange={(e) => setName(e.target.value)} className="text-[13px]" />
          </div>

          <div>
            <Label className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
              Therapy areas *
            </Label>
            <ChipPicker
              options={THERAPY_OPTIONS}
              selected={therapy}
              onChange={(v) => setTherapy(v as DivisionTherapy[])}
              placeholder="Add a therapy area..."
              labelFor={(v) => DIVISION_THERAPY_LABEL[v as DivisionTherapy]}
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <Label className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
                Brand focus
              </Label>
              <Input type="text" value={brandFocus} onChange={(e) => setBrandFocus(e.target.value)} className="text-[13px]" />
            </div>
            <div>
              <Label className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
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
            <Label className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
              Status *
            </Label>
            <Select key={status || 'empty'} value={status || undefined} onValueChange={(v) => setStatus(v as DivisionStatus)}>
              <SelectTrigger className="w-full text-[13px]">
                <SelectValue>{(v: string) => STATUS_OPTIONS.find((s) => s.value === v)?.label ?? 'Status'}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {updateDivision.isError && (
            <div className="text-xs rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">
              {(updateDivision.error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                'Could not update the division — try again.'}
            </div>
          )}

          {formError && (
            <div className="text-xs rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">
              {formError}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={updateDivision.isPending}>
              {updateDivision.isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default EditDivisionModal
