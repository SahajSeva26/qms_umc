import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/sonner'
import { setDietitianResume } from '@/features/diet/dietitians.service'

interface ResumeUploadDialogProps {
  open: boolean
  dietitianId: string
  currentResumeUrl: string
  onClose: () => void
  onSaved: () => void
}

const ResumeUploadDialog = ({ open, dietitianId, currentResumeUrl, onClose, onSaved }: ResumeUploadDialogProps) => {
  const [url, setUrl] = useState(currentResumeUrl)

  useEffect(() => {
    if (open) setUrl(currentResumeUrl)
  }, [open, currentResumeUrl])

  const save = async () => {
    if (!url.trim()) {
      toast.error('Resume URL / file path is required')
      return
    }
    await setDietitianResume(dietitianId, url.trim())
    toast.success('Resume saved')
    onSaved()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Upload resume</DialogTitle>
        </DialogHeader>
        <div>
          <label className="text-[10.5px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Resume URL / file path *</label>
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="/resumes/jane-doe.pdf" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ResumeUploadDialog
