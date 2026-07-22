import { useState } from 'react'
import { FiSave } from 'react-icons/fi'
import type { DivisionTherapy } from '@/types/crm.types'
import { DIVISION_THERAPY_LABEL } from '@/types/crm.types'
import { createDivisionSchema } from '@/features/company-data/divisions/schemas/division.schemas'
import { useCreateDivision } from '@/features/company-data/divisions/hooks/useCreateDivision'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { toast } from '@/components/ui/sonner'

interface CreateDivisionModalProps {
  onClose: () => void
}

const THERAPY_OPTIONS = Object.keys(DIVISION_THERAPY_LABEL) as DivisionTherapy[]

// Create-only, per the confirmed scope ("for creating we will have modal") —
// there is no dedicated edit route; a status/therapy/brand-focus/mrCount
// change happens inline from the table (future pass) via useUpdateDivision,
// not through this component.
const CreateDivisionModal = ({ onClose }: CreateDivisionModalProps) => {
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [therapy, setTherapy] = useState<DivisionTherapy | ''>('')
  const [brandFocus, setBrandFocus] = useState('')
  const [mrCount, setMrCount] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const createDivision = useCreateDivision()

  const handleSave = async () => {
    const result = createDivisionSchema.safeParse({
      code: code.toLowerCase(),
      name,
      therapy: therapy || undefined,
      brandFocus: brandFocus || undefined,
      mrCount,
    })
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Please complete the required fields.')
      return
    }
    setError(null)

    try {
      await createDivision.mutateAsync(result.data)
      toast.success('Division created')
      onClose()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not create the division — try again.')
    }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="text-sm font-bold" style={{ color: 'var(--qms-text)' }}>New division</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="block text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
              Code *
            </Label>
            <Input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. cardio1"
              className="text-[13px]"
            />
          </div>

          <div>
            <Label className="block text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
              Name *
            </Label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Cardiology Division"
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

          {error && <p className="text-[12px] text-danger">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={createDivision.isPending} className="font-bold text-white" style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}>
            <FiSave size={14} /> {createDivision.isPending ? 'Creating…' : 'Create division'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default CreateDivisionModal
