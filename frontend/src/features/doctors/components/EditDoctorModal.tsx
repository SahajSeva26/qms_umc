import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { toast } from '@/components/ui/sonner'
import { useCreateDoctor } from '@/features/doctors/hooks/useCreateDoctor'
import { useUpdateDoctor } from '@/features/doctors/hooks/useUpdateDoctor'
import type { DoctorEntity, DoctorSpecialization, DoctorStatus } from '@/types/doctor.types'

const SPECIALIZATION_OPTIONS: { value: DoctorSpecialization; label: string }[] = [
  { value: 'cp', label: 'CP' },
  { value: 'gp', label: 'GP' },
]

const STATUS_OPTIONS: { value: DoctorStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]

interface DoctorDraft {
  pharmaCode: string
  name: string
  specialization: DoctorSpecialization
  mobile: string
  city: string
  state: string
  pincode: string
  email: string
  googleMapLink: string
  status: DoctorStatus
}

const emptyDraft: DoctorDraft = { pharmaCode: '', name: '', specialization: 'cp', mobile: '', city: '', state: '', pincode: '', email: '', googleMapLink: '', status: 'active' }

function draftFromDoctor(d: DoctorEntity): DoctorDraft {
  return {
    pharmaCode: d.pharmaCode,
    name: d.name,
    specialization: d.specialization,
    mobile: d.mobile,
    city: d.city,
    state: d.state,
    pincode: d.pincode,
    email: d.email,
    googleMapLink: d.googleMapLink || '',
    status: d.status ?? 'active',
  }
}

interface EditDoctorModalProps {
  open: boolean
  doctor: DoctorEntity | null
  onClose: () => void
}

// Outer shell only renders the actual form while open, keyed on the doctor
// id — remounts the inner form (resetting its draft state) every time a
// different doctor (or "new") is opened, without needing a useEffect to
// re-sync state from props.
const EditDoctorModal = ({ open, doctor, onClose }: EditDoctorModalProps) => {
  if (!open) return null
  return <EditDoctorModalForm key={doctor?.id ?? '__new__'} doctor={doctor} onClose={onClose} />
}

interface EditDoctorModalFormProps {
  doctor: DoctorEntity | null
  onClose: () => void
}

const EditDoctorModalForm = ({ doctor, onClose }: EditDoctorModalFormProps) => {
  const isEdit = !!doctor
  const [draft, setDraft] = useState<DoctorDraft>(doctor ? draftFromDoctor(doctor) : emptyDraft)

  const createDoctor = useCreateDoctor()
  const updateDoctor = useUpdateDoctor(doctor?.id ?? '')

  const handleClose = () => onClose()

  const handleSave = async () => {
    if (!draft.name.trim()) {
      toast.error('Doctor name is required')
      return
    }

    try {
      if (isEdit) {
        // pharmaCode is immutable — not sent on update (matches backend's
        // UpdateDoctorPayloadSchema, which has no pharmaCode field at all).
        await updateDoctor.mutateAsync({
          name: draft.name,
          specialization: draft.specialization,
          mobile: draft.mobile,
          city: draft.city,
          state: draft.state,
          pincode: draft.pincode,
          email: draft.email,
          googleMapLink: draft.googleMapLink || undefined,
          status: draft.status,
        })
        toast.success('Doctor updated')
      } else {
        if (!draft.pharmaCode.trim()) {
          toast.error('Pharma doctor code is required')
          return
        }
        await createDoctor.mutateAsync({
          pharmaCode: draft.pharmaCode,
          name: draft.name,
          specialization: draft.specialization,
          mobile: draft.mobile,
          city: draft.city,
          state: draft.state,
          pincode: draft.pincode,
          email: draft.email,
          googleMapLink: draft.googleMapLink || undefined,
        })
        toast.success('Doctor added')
      }
      handleClose()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not save doctor — try again.')
    }
  }

  const isSaving = createDoctor.isPending || updateDoctor.isPending

  return (
    <Dialog open onOpenChange={(o) => { if (!o) handleClose() }}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit doctor' : 'Add doctor'}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Pharma doctor code</label>
            <Input
              value={draft.pharmaCode}
              onChange={(e) => setDraft((p) => ({ ...p, pharmaCode: e.target.value }))}
              disabled={isEdit}
            />
          </div>
          <div>
            <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Doctor name</label>
            <Input value={draft.name} onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))} />
          </div>
          <div>
            <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Specialization</label>
            <Select value={draft.specialization} onValueChange={(v) => setDraft((p) => ({ ...p, specialization: v as DoctorSpecialization }))}>
              <SelectTrigger className="w-full text-[13px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SPECIALIZATION_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Mobile</label>
            <Input value={draft.mobile} onChange={(e) => setDraft((p) => ({ ...p, mobile: e.target.value }))} />
          </div>
          <div>
            <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>City</label>
            <Input value={draft.city} onChange={(e) => setDraft((p) => ({ ...p, city: e.target.value }))} />
          </div>
          <div>
            <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>State</label>
            <Input value={draft.state} onChange={(e) => setDraft((p) => ({ ...p, state: e.target.value }))} />
          </div>
          <div>
            <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Pincode</label>
            <Input value={draft.pincode} onChange={(e) => setDraft((p) => ({ ...p, pincode: e.target.value }))} />
          </div>
          <div>
            <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Email</label>
            <Input value={draft.email} onChange={(e) => setDraft((p) => ({ ...p, email: e.target.value }))} />
          </div>
          <div className="sm:col-span-2">
            <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Google Maps link</label>
            <Input value={draft.googleMapLink} onChange={(e) => setDraft((p) => ({ ...p, googleMapLink: e.target.value }))} />
          </div>
          {isEdit && (
            <div>
              <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Status</label>
              <Select value={draft.status} onValueChange={(v) => setDraft((p) => ({ ...p, status: v as DoctorStatus }))}>
                <SelectTrigger className="w-full text-[13px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving}>{isEdit ? 'Save changes' : 'Add doctor'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default EditDoctorModal
