import { useState } from 'react'
import { FiUserPlus } from 'react-icons/fi'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/sonner'
import { addDietitianEnrollment } from '@/features/diet/dietitians.service'
import type { DietitianRosterEntry } from '@/features/diet/dietitians.types'

const DEVICE_OPTIONS = ['BCA', 'BMI', 'Bloodsugar', 'BP', 'ECG']

interface AddDietitianModalProps {
  open: boolean
  onClose: () => void
  onCreated: (rec: DietitianRosterEntry) => void
}

const emptyDraft = {
  name: '', specialty: 'Clinical nutrition', phone: '', email: '', hq: '', states: '',
  ratePerCamp: '3000', pan: '', address: '',
  bankName: '', accountHolder: '', accountNumber: '', ifsc: '', upi: '',
  resumeUrl: '', devices: new Set<string>(),
}

// Own copy of the Add Dietitian modal — same field set/behaviour as the Diet
// Coord Workspace screen's own modal (built independently there, per the
// build brief, since that screen may not exist yet in this working tree).
const AddDietitianModal = ({ open, onClose, onCreated }: AddDietitianModalProps) => {
  const [draft, setDraft] = useState(emptyDraft)

  const reset = () => setDraft(emptyDraft)
  const handleClose = () => { reset(); onClose() }

  const toggleDevice = (opt: string) =>
    setDraft((p) => {
      const next = new Set(p.devices)
      if (next.has(opt)) next.delete(opt)
      else next.add(opt)
      return { ...p, devices: next }
    })

  const save = async () => {
    if (!draft.name.trim()) {
      toast.error('Full name is required')
      return
    }
    const states = draft.states.split(',').map((s) => s.trim()).filter(Boolean)
    const bankAccounts = (draft.accountNumber.trim() || draft.upi.trim())
      ? [{
          label: 'Account 1',
          accountName: draft.accountHolder || undefined,
          accountNumber: draft.accountNumber || undefined,
          ifsc: draft.ifsc || undefined,
          branch: draft.bankName || undefined,
          upi: draft.upi || undefined,
        }]
      : undefined

    const rec = await addDietitianEnrollment({
      name: draft.name.trim(),
      specialty: draft.specialty || 'Clinical nutrition',
      phone: draft.phone,
      email: draft.email,
      hq: draft.hq,
      states,
      ratePerCamp: Number(draft.ratePerCamp) || 3000,
      pan: draft.pan,
      address: draft.address,
      resumeUrl: draft.resumeUrl,
      deviceAlignment: Array.from(draft.devices),
      bankAccounts,
    })

    toast.success(`Dietitian enrolled · ${rec.name}`)
    reset()
    onCreated(rec)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FiUserPlus size={16} /> Add Dietitian</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div className="sm:col-span-2">
            <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Full name *</label>
            <Input value={draft.name} onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))} />
          </div>
          <div>
            <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Specialty</label>
            <Input value={draft.specialty} onChange={(e) => setDraft((p) => ({ ...p, specialty: e.target.value }))} />
          </div>
          <div>
            <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Phone</label>
            <Input value={draft.phone} onChange={(e) => setDraft((p) => ({ ...p, phone: e.target.value }))} />
          </div>
          <div>
            <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Email</label>
            <Input value={draft.email} onChange={(e) => setDraft((p) => ({ ...p, email: e.target.value }))} />
          </div>
          <div>
            <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>HQ city</label>
            <Input value={draft.hq} onChange={(e) => setDraft((p) => ({ ...p, hq: e.target.value }))} />
          </div>
          <div>
            <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>States covered (comma-separated)</label>
            <Input value={draft.states} onChange={(e) => setDraft((p) => ({ ...p, states: e.target.value }))} placeholder="KA, MH" />
          </div>
          <div>
            <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Rate per camp ₹</label>
            <Input type="number" value={draft.ratePerCamp} onChange={(e) => setDraft((p) => ({ ...p, ratePerCamp: e.target.value }))} />
          </div>
          <div>
            <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>PAN</label>
            <Input value={draft.pan} onChange={(e) => setDraft((p) => ({ ...p, pan: e.target.value.toUpperCase() }))} />
          </div>
          <div className="sm:col-span-2">
            <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Address</label>
            <Textarea value={draft.address} onChange={(e) => setDraft((p) => ({ ...p, address: e.target.value }))} rows={2} />
          </div>
        </div>

        <div className="text-[11px] font-extrabold uppercase tracking-wide mt-2" style={{ color: 'var(--qms-text-soft)' }}>Bank details (optional)</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div>
            <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Bank name</label>
            <Input value={draft.bankName} onChange={(e) => setDraft((p) => ({ ...p, bankName: e.target.value }))} />
          </div>
          <div>
            <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Account holder</label>
            <Input value={draft.accountHolder} onChange={(e) => setDraft((p) => ({ ...p, accountHolder: e.target.value }))} />
          </div>
          <div>
            <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Account number</label>
            <Input value={draft.accountNumber} onChange={(e) => setDraft((p) => ({ ...p, accountNumber: e.target.value }))} />
          </div>
          <div>
            <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>IFSC</label>
            <Input value={draft.ifsc} onChange={(e) => setDraft((p) => ({ ...p, ifsc: e.target.value.toUpperCase() }))} />
          </div>
          <div>
            <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>UPI ID</label>
            <Input value={draft.upi} onChange={(e) => setDraft((p) => ({ ...p, upi: e.target.value }))} />
          </div>
        </div>

        <div className="text-[11px] font-extrabold uppercase tracking-wide mt-2" style={{ color: 'var(--qms-text-soft)' }}>Resume &amp; device alignment (optional)</div>
        <div>
          <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Resume link</label>
          <Input value={draft.resumeUrl} onChange={(e) => setDraft((p) => ({ ...p, resumeUrl: e.target.value }))} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {DEVICE_OPTIONS.map((opt) => (
            <label
              key={opt}
              className="flex items-center gap-1.5 text-[12px] font-semibold rounded-lg border px-2 py-1.5 cursor-pointer"
              style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text)' }}
            >
              <input type="checkbox" checked={draft.devices.has(opt)} onChange={() => toggleDevice(opt)} />
              {opt}
            </label>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={save}>Enroll dietitian</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default AddDietitianModal
