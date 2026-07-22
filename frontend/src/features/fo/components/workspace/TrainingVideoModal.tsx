import { FiPlay, FiFileText, FiCheck } from 'react-icons/fi'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import type { TrainingCatalogEntry } from '@/features/fo/fo.types'

interface TrainingVideoModalProps {
  open: boolean
  entry: TrainingCatalogEntry | null
  onClose: () => void
  onMarkComplete: (code: string) => void
}

const TrainingVideoModal = ({ open, entry, onClose, onMarkComplete }: TrainingVideoModalProps) => {
  if (!entry) return null

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>{entry.name}</DialogTitle></DialogHeader>

        <div className="rounded-xl aspect-video flex flex-col items-center justify-center gap-2" style={{ background: '#0f172a' }}>
          <FiPlay size={36} color="#fff" style={{ opacity: 0.7 }} />
          <div className="text-[12px]" style={{ color: 'rgba(255,255,255,.7)' }}>Training video · {entry.code}</div>
        </div>

        {entry.sopUrl && (
          <a href={entry.sopUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold" style={{ color: 'var(--qms-brand)' }}>
            <FiFileText size={13} /> View SOP document
          </a>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={() => onMarkComplete(entry.code)}><FiCheck size={13} /> Mark complete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default TrainingVideoModal
