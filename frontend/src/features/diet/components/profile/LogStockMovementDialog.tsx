import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/sonner'
import { logStockMovement } from '@/features/diet/dietitians.service'

interface LogStockMovementDialogProps {
  open: boolean
  dietitianId: string
  userName: string
  onClose: () => void
  onSaved: () => void
}

const DEFAULT_ACTION = 'Scale shipped from warehouse'

const LogStockMovementDialog = ({ open, dietitianId, userName, onClose, onSaved }: LogStockMovementDialogProps) => {
  const [action, setAction] = useState(DEFAULT_ACTION)

  useEffect(() => {
    if (open) setAction(DEFAULT_ACTION)
  }, [open])

  const save = async () => {
    if (!action.trim()) {
      toast.error('Movement description is required')
      return
    }
    await logStockMovement(dietitianId, { action: action.trim(), fromLocation: 'QMS Warehouse', toLocation: '' }, userName)
    toast.success('Stock movement logged')
    onSaved()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Log stock movement</DialogTitle>
        </DialogHeader>
        <div>
          <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Movement description</label>
          <Input value={action} onChange={(e) => setAction(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>Log</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default LogStockMovementDialog
