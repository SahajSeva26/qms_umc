import { useEffect, useState } from 'react'
import { FiX } from 'react-icons/fi'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/sonner'

interface DenyReopenModalProps {
  open: boolean
  onClose: () => void
  onConfirm: (reason: string) => void
}

// Native prompt() isn't idiomatic in React — this is the spec's called-for
// small inline confirmation dialog with a required reason textarea.
const DenyReopenModal = ({ open, onClose, onConfirm }: DenyReopenModalProps) => {
  const [reason, setReason] = useState('')

  useEffect(() => {
    if (open) setReason('')
  }, [open])

  const handleConfirm = () => {
    if (!reason.trim()) {
      toast.error('Reason is required to deny')
      return
    }
    onConfirm(reason.trim())
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Deny reopen request</DialogTitle>
        </DialogHeader>
        <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Reason *</label>
        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Why is this reopen request being denied?" />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" onClick={handleConfirm}><FiX size={13} /> Confirm deny</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default DenyReopenModal
