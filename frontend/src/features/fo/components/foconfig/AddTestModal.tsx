import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { FoTestDef } from '@/features/fo/foConfig.types'

interface AddTestModalProps {
  open: boolean
  onClose: () => void
  onSave: (def: FoTestDef) => void
}

// "Add test" modal — shared by the page header button and the Test Master
// tab's own "New" button. Normalizes the id, defaults the display name to
// the id, and hands back a fresh FoTestDef with no rules yet.
const AddTestModal = ({ open, onClose, onSave }: AddTestModalProps) => {
  const [id, setId] = useState('')
  const [name, setName] = useState('')

  const handleClose = () => {
    setId('')
    setName('')
    onClose()
  }

  const handleSave = () => {
    const normalizedId = id.toUpperCase().replace(/\s+/g, '_')
    if (!normalizedId) return
    onSave({ id: normalizedId, name: name.trim() || normalizedId, inputType: 'number', rules: [] })
    setId('')
    setName('')
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add test</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wide mb-1 block" style={{ color: 'var(--qms-text-muted)' }}>Test ID</label>
            <Input value={id} onChange={(e) => setId(e.target.value)} placeholder="e.g. GLUCOSE_PP" />
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wide mb-1 block" style={{ color: 'var(--qms-text-muted)' }}>Display name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={id || 'Defaults to ID if left blank'} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!id.trim()}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default AddTestModal
