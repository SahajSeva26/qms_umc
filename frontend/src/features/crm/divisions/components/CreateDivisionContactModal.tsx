import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/sonner'
import { useCreateContact } from '@/features/contacts/hooks/useCreateContact'
import { createContactSchema } from '@/features/contacts/schemas/contact.schemas'

interface CreateDivisionContactModalProps {
  tenantId: string
  divisionId: string
  onClose: () => void
}

// Leaner than EditContactModal.tsx — tenant/division are already fixed by
// the page this opens from, so no Company/Division picker is needed.
const CreateDivisionContactModal = ({ tenantId, divisionId, onClose }: CreateDivisionContactModalProps) => {
  const [name, setName] = useState('')
  const [designation, setDesignation] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [location, setLocation] = useState('')
  const [error, setError] = useState<string | null>(null)

  const createContact = useCreateContact()

  const handleSave = async () => {
    const result = createContactSchema.safeParse({
      tenant: tenantId,
      division: divisionId,
      name,
      designation: designation || undefined,
      email: email || undefined,
      phone: phone || undefined,
      location: location || undefined,
      type: 'customer',
    })
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Please complete the required fields.')
      return
    }
    setError(null)

    try {
      await createContact.mutateAsync({
        tenant: result.data.tenant,
        division: result.data.division,
        name: result.data.name,
        designation: result.data.designation || undefined,
        email: result.data.email || undefined,
        phone: result.data.phone || undefined,
        location: result.data.location || undefined,
        type: result.data.type,
      })
      toast.success('Contact added')
      onClose()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not add contact — try again.')
    }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="text-sm font-bold" style={{ color: 'var(--qms-text)' }}>New contact</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="block text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
              Name *
            </Label>
            <Input type="text" value={name} onChange={(e) => setName(e.target.value)} className="text-[13px]" />
          </div>

          <div>
            <Label className="block text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
              Designation
            </Label>
            <Input type="text" value={designation} onChange={(e) => setDesignation(e.target.value)} className="text-[13px]" />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <Label className="block text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
                Email
              </Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="text-[13px]" />
            </div>
            <div>
              <Label className="block text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
                Phone
              </Label>
              <Input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className="text-[13px]" />
            </div>
          </div>

          <div>
            <Label className="block text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
              Location
            </Label>
            <Input type="text" value={location} onChange={(e) => setLocation(e.target.value)} className="text-[13px]" />
          </div>

          {error && <p className="text-[12px] text-danger">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleSave}
            disabled={createContact.isPending}
            className="font-bold text-white"
            style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
          >
            {createContact.isPending ? 'Adding…' : 'Add contact'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default CreateDivisionContactModal
