import { useState } from 'react'
import { FiCamera, FiCheck, FiRotateCcw } from 'react-icons/fi'
import { Button } from '@/components/ui/button'
import CameraGeoCapture, { type CaptureResult } from '@/components/ui/CameraGeoCapture'

// The prototype (fo-camp-run.js) gates stage completion on 5 separate
// setup-photo slots (machine/consumables/apron/branding/desk), but that gate
// is unreachable in practice — this build fixes it by using ONE mandatory
// "Camp setup photo" tile per the research spec's explicit call-out.
const SETUP_PHOTO_KEY = 'setup'

interface SetupPhotoStageProps {
  setupPhotos?: Record<string, string>
  onCapture: (key: string, dataUrl: string) => void
}

const SetupPhotoStage = ({ setupPhotos, onCapture }: SetupPhotoStageProps) => {
  const [open, setOpen] = useState(false)
  const photo = setupPhotos?.[SETUP_PHOTO_KEY]

  const handleConfirm = (result: CaptureResult) => {
    onCapture(SETUP_PHOTO_KEY, result.dataUrl)
    setOpen(false)
  }

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div className="text-center">
        <div className="text-[15px] font-bold" style={{ color: 'var(--qms-text)' }}>Camp setup photo</div>
        <div className="text-[12.5px] mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>Devices + desk + branding in one frame</div>
      </div>

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 overflow-hidden"
        style={{ borderColor: photo ? 'var(--success)' : 'var(--qms-border)', minHeight: 220, background: 'var(--qms-surface)' }}
      >
        {photo ? (
          <img src={photo} alt="Camp setup" className="w-full h-full object-cover" style={{ minHeight: 220 }} />
        ) : (
          <div className="flex flex-col items-center gap-2 py-10" style={{ color: 'var(--qms-text-muted)' }}>
            <FiCamera size={28} />
            <span className="text-[12.5px] font-semibold">Tap to capture</span>
          </div>
        )}
      </button>

      {photo && (
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'var(--success-soft)', color: 'var(--success)' }}>
            <FiCheck size={11} /> Captured
          </span>
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}><FiRotateCcw size={13} /> Re-take</Button>
        </div>
      )}

      <CameraGeoCapture open={open} title="Camp setup photo" facing="environment" onConfirm={handleConfirm} onClose={() => setOpen(false)} />
    </div>
  )
}

export default SetupPhotoStage
