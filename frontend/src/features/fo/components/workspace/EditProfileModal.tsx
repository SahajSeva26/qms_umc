import { useState } from 'react'
import type { Person } from '@/types/people.types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from '@/components/ui/sonner'

interface EditProfileModalProps {
  open: boolean
  me: Person
  onClose: () => void
  onSave: (patch: Pick<Person, 'phone' | 'altPhone' | 'email' | 'temporaryAddress'>) => void
}

// UI-only stub per the task's scope rule — this edits the FO's own contact
// fields locally (no cross-service persistence to the People master yet).
const EditProfileModal = ({ open, me, onClose, onSave }: EditProfileModalProps) => {
  const [phone, setPhone] = useState(me.phone ?? '')
  const [altPhone, setAltPhone] = useState(me.altPhone ?? '')
  const [email, setEmail] = useState(me.email ?? '')
  const [temporaryAddress, setTemporaryAddress] = useState(me.temporaryAddress ?? '')

  const handleClose = () => onClose()

  const handleSave = () => {
    onSave({ phone, altPhone, email, temporaryAddress })
    toast.success('Profile updated')
    handleClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Edit profile</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3 text-[13px]">
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Phone</label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Alt phone</label>
            <Input value={altPhone} onChange={(e) => setAltPhone(e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Email</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Temporary address</label>
            <Input value={temporaryAddress} onChange={(e) => setTemporaryAddress(e.target.value)} />
          </div>
        </div>
        <div className="text-[11.5px] rounded-lg px-3 py-2" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' }}>
          Other fields are HR-managed and locked from FO edits.
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSave}>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default EditProfileModal
