import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/sonner'
import { verifyBcaScale } from '@/features/diet/dietitians.service'

interface BcaVerifyDialogProps {
  open: boolean
  dietitianId: string
  userName: string
  onClose: () => void
  onSaved: () => void
}

// Stands in for the prototype's native prompt() — asks for a training-video
// URL, then calls verifyBcaScale() (owned=true, verified=true).
const BcaVerifyDialog = ({ open, dietitianId, userName, onClose, onSaved }: BcaVerifyDialogProps) => {
  const [videoUrl, setVideoUrl] = useState('')

  const save = async () => {
    await verifyBcaScale(dietitianId, { videoUrl: videoUrl.trim() || undefined }, userName)
    toast.success('BCA scale verified · trained dietitian')
    setVideoUrl('')
    onSaved()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Verify BCA scale</DialogTitle>
        </DialogHeader>
        <div>
          <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Video URL</label>
          <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://…" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>Verify</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default BcaVerifyDialog
