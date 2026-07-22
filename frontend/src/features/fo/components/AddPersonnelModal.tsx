import { useState } from 'react'
import type { Person } from '@/types/people.types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from '@/components/ui/sonner'

interface AddPersonnelModalProps {
  open: boolean
  onClose: () => void
  title: string
  showVendor?: boolean
  onAdd: (person: Person) => void
}

// Scoped-down single-step "add" form — a full 5-step People Wizard is out of
// scope for this pass (per the build spec's own recommendation). Adds a
// local-only Person record; no backend endpoint exists for this master yet.
const AddPersonnelModal = ({ open, onClose, title, showVendor, onAdd }: AddPersonnelModalProps) => {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [hq, setHq] = useState('')
  const [vendor, setVendor] = useState('')
  const [salary, setSalary] = useState('20000')
  const [campsPerDay, setCampsPerDay] = useState('1')

  const reset = () => {
    setName(''); setPhone(''); setEmail(''); setHq(''); setVendor(''); setSalary('20000'); setCampsPerDay('1')
  }

  const handleClose = () => { reset(); onClose() }

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error('Name is required')
      return
    }
    const person: Person = {
      id: `p-${Date.now()}`,
      name: name.trim(),
      role: 'Field Officer',
      phone,
      email,
      hq,
      states: hq ? [hq] : [],
      joined: new Date().toISOString().slice(0, 10),
      vendor: showVendor ? (vendor.trim() || undefined) : undefined,
      salaryInr: Number(salary) || 0,
      campsPerDay: Number(campsPerDay) || 1,
      machinesAssigned: [],
    }
    onAdd(person)
    toast.success(`${person.name} added`)
    handleClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3 text-[13px]">
          <div className="col-span-2">
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Full name *</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ravi Sharma" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Phone</label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Email</label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>HQ city</label>
            <Input value={hq} onChange={(e) => setHq(e.target.value)} />
          </div>
          {showVendor && (
            <div>
              <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Vendor</label>
              <Input value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="Manpower agency" />
            </div>
          )}
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Salary ₹/mo</label>
            <Input type="number" min={0} value={salary} onChange={(e) => setSalary(e.target.value)} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Camps/day</label>
            <Input type="number" min={0} value={campsPerDay} onChange={(e) => setCampsPerDay(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button disabled={!name.trim()} onClick={handleSubmit}>Add</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default AddPersonnelModal
