import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { MachineFlag } from '@/features/fo/fo.types'

interface ClearFlagDialogProps {
  flag: MachineFlag | null
  deviceName: string
  onClose: () => void
  onConfirm: () => void
}

// Mirrors incidents.js's inClearFlag(): a confirm() prompt ("Mark X as
// repaired and re-enable for allocation?") — rebuilt as a shadcn Dialog per
// this build's "no native confirm()" requirement.
const ClearFlagDialog = ({ flag, deviceName, onClose, onConfirm }: ClearFlagDialogProps) => {
  if (!flag) return null

  return (
    <Dialog open={!!flag} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Clear machine flag</DialogTitle></DialogHeader>
        <p className="text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>
          Mark <b style={{ color: 'var(--qms-text)' }}>{deviceName}</b> as repaired and re-enable for allocation?
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={onConfirm}>Clear flag</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ClearFlagDialog
