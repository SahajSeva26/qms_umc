import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { doctorSchema } from '@/features/crm/clients/schemas'

interface AddDoctorDialogProps {
  onClose: () => void
  onSave: (input: { name: string; specialty: string; city: string }) => void | Promise<void>
}

const FieldLabel = ({ children }: { children: string }) => (
  <Label className="block text-[10px] font-semibold tracking-widest uppercase mb-1.5" style={{ color: 'var(--qms-text-muted)' }}>
    {children}
  </Label>
)

const AddDoctorDialog = ({ onClose, onSave }: AddDoctorDialogProps) => {
  const [name, setName] = useState('')
  const [specialty, setSpecialty] = useState('')
  const [city, setCity] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    const result = doctorSchema.safeParse({ name, specialty, city })
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Doctor name is required.')
      return
    }
    await onSave(result.data)
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="text-sm font-bold" style={{ color: 'var(--qms-text)' }}>Add doctor</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3">
          <div>
            <FieldLabel>Name *</FieldLabel>
            <Input value={name} onChange={(e) => { setName(e.target.value); setError(null) }} placeholder="Dr. Full Name" className="text-[13px]" />
          </div>
          <div>
            <FieldLabel>Specialty</FieldLabel>
            <Input value={specialty} onChange={(e) => setSpecialty(e.target.value)} placeholder="e.g. Cardiology" className="text-[13px]" />
          </div>
          <div>
            <FieldLabel>City</FieldLabel>
            <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Mumbai" className="text-[13px]" />
          </div>
        </div>

        {error && <p className="text-[11px] text-danger">{error}</p>}

        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Add doctor</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default AddDoctorDialog
