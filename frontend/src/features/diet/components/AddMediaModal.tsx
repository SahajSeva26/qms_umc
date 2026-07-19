import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { FiUpload } from 'react-icons/fi'
import { toast } from '@/components/ui/sonner'
import { useAuth } from '@/hooks/useAuth'

interface AddMediaModalProps {
  open: boolean
  onClose: () => void
  campId: string
}

// Mirrors window.dcAddMedia's inline modal (diet-camps.js:1761-1804) — Type
// (photo/video), Uploaded by (defaults to the logged-in user's name, falls
// back to 'FO'), URL, Caption. UI only for now — actual persistence into the
// diet media log (diet.service.ts's addMedia) is a later wiring pass.
const AddMediaModal = ({ open, onClose, campId }: AddMediaModalProps) => {
  const { user } = useAuth()
  const [kind, setKind] = useState<'photo' | 'video'>('photo')
  const [by, setBy] = useState(user ? `${user.firstName} ${user.lastName}`.trim() : 'FO')
  const [url, setUrl] = useState('')
  const [caption, setCaption] = useState('')

  const handleUpload = () => {
    if (!url.trim()) {
      toast.error('Add a URL')
      return
    }
    toast.info('UI only — wiring comes next pass')
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload media</DialogTitle>
          <div className="text-xs" style={{ color: 'var(--qms-text-muted)' }}>{campId}</div>
        </DialogHeader>
        <div className="space-y-3 text-[13px]">
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Type</label>
            <Select value={kind} onValueChange={(v) => setKind((v as 'photo' | 'video') ?? 'photo')}>
              <SelectTrigger className="w-full text-[13px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="photo">Photo</SelectItem>
                <SelectItem value="video">Video</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Uploaded by</label>
            <Input value={by} onChange={(e) => setBy(e.target.value)} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>URL</label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/photo.jpg" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'var(--qms-text-muted)' }}>Caption</label>
            <Input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Diet awareness session · group photo" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleUpload}><FiUpload size={14} /> Add media</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default AddMediaModal
