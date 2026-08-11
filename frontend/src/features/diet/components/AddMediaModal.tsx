import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { FiUpload } from 'react-icons/fi'
import { toast } from '@/components/ui/sonner'
import { useAuth } from '@/hooks/useAuth'
import type { MediaItem } from '@/features/diet/diet.types'

interface AddMediaModalProps {
  open: boolean
  onClose: () => void
  campId: string
  /** Persists the item — supplied by MediaTab from useDietCamps().addMedia. */
  onAdd: (campId: string, item: MediaItem) => Promise<unknown>
}

// Mirrors window.dcAddMedia's inline modal (diet-camps.js:1761-1804) — Type
// (photo/video), Uploaded by (defaults to the logged-in user's name, falls
// back to 'FO'), URL, Caption.
//
// Persists through useDietCamps().addMedia → diet.service.addMedia, which
// invalidates ['diet-own-data'] so MediaTab's grid picks the item up. The
// service, the mutation and the MediaItem type all already existed; only this
// call site was missing.
const AddMediaModal = ({ open, onClose, campId, onAdd }: AddMediaModalProps) => {
  const { user } = useAuth()
  const [kind, setKind] = useState<'photo' | 'video'>('photo')
  const [by, setBy] = useState(user ? `${user.firstName} ${user.lastName}`.trim() : 'FO')
  const [url, setUrl] = useState('')
  const [caption, setCaption] = useState('')
  const [saving, setSaving] = useState(false)

  const handleUpload = async () => {
    if (!url.trim()) {
      toast.error('Add a URL')
      return
    }
    setSaving(true)
    try {
      await onAdd(campId, {
        kind,
        url: url.trim(),
        caption: caption.trim(),
        by: by.trim() || 'FO',
        when: new Date().toISOString(),
      })
      toast.success(`${kind === 'video' ? 'Video' : 'Photo'} added to ${campId}`)
      setUrl('')
      setCaption('')
      onClose()
    } catch {
      toast.error('Could not add media — try again.')
    } finally {
      setSaving(false)
    }
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
          <Button onClick={handleUpload} disabled={saving}><FiUpload size={14} /> Add media</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default AddMediaModal
