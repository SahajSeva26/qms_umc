import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/sonner'
import { setDietitianDeviceAlignment } from '@/features/diet/dietitians.service'

const DEVICE_OPTIONS = ['BCA', 'BMI', 'Bloodsugar', 'BP', 'ECG']

interface DeviceAlignmentDialogProps {
  open: boolean
  dietitianId: string
  current: string[]
  onClose: () => void
  onSaved: () => void
}

const DeviceAlignmentDialog = ({ open, dietitianId, current, onClose, onSaved }: DeviceAlignmentDialogProps) => {
  const [picked, setPicked] = useState<Set<string>>(new Set(current))

  useEffect(() => {
    if (open) setPicked(new Set(current))
  }, [open, current])

  const toggle = (opt: string) =>
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(opt)) next.delete(opt)
      else next.add(opt)
      return next
    })

  const save = async () => {
    const list = Array.from(picked)
    await setDietitianDeviceAlignment(dietitianId, list)
    toast.success(`Device alignment saved · ${list.length ? list.join(', ') : 'none'}`)
    onSaved()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Device alignment</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2">
          {DEVICE_OPTIONS.map((opt) => (
            <label
              key={opt}
              className="flex items-center gap-2 text-[13px] font-semibold rounded-lg border px-2.5 py-2 cursor-pointer"
              style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text)' }}
            >
              <input type="checkbox" checked={picked.has(opt)} onChange={() => toggle(opt)} />
              {opt}
            </label>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default DeviceAlignmentDialog
