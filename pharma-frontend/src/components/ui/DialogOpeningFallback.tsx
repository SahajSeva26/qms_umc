import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface DialogOpeningFallbackProps {
  title?: string
}

// A dialog shell, not a content skeleton — no real shape to match yet for a lazy-loaded editor
// (a form, not a list, so there's no row/card layout worth approximating). Shared by every
// lazy EditDoctorModal mount so a loading dialog never silently renders as nothing.
const DialogOpeningFallback = ({ title = 'Opening editor…' }: DialogOpeningFallbackProps) => (
  <Dialog open>
    <DialogContent className="sm:max-w-2xl" showCloseButton={false}>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      <div className="flex items-center justify-center py-10">
        <div
          className="h-6 w-6 rounded-full border-2 animate-spin"
          style={{ borderColor: 'var(--qms-border)', borderTopColor: 'var(--qms-brand)' }}
        />
      </div>
    </DialogContent>
  </Dialog>
)

export default DialogOpeningFallback
