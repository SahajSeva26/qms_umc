import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface StartOverUploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  isSubmitting?: boolean
}

// Presentation-only confirmation for discarding a failed upload and starting fresh — reusable
// across any entity's upload flow. Mirrors ClearFlagDialog.tsx's "no native confirm()" pattern.
const StartOverUploadDialog = ({ open, onOpenChange, onConfirm, isSubmitting }: StartOverUploadDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Start a new upload?</DialogTitle></DialogHeader>
        <p className="text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>
          We'll attempt to discard this failed attempt and create a fresh upload link.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onConfirm} disabled={isSubmitting}>Start new upload</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default StartOverUploadDialog
