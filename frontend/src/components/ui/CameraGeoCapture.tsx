import { useEffect, useRef, useState } from 'react'
import { FiCamera, FiRotateCcw, FiMapPin, FiX, FiCheck } from 'react-icons/fi'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/sonner'

export interface CaptureGeo {
  lat: number
  lng: number
  accuracy?: number
}

export interface CaptureResult {
  dataUrl: string
  geo: CaptureGeo | null
}

interface CameraGeoCaptureProps {
  open: boolean
  title: string
  facing?: 'user' | 'environment'
  onConfirm: (result: CaptureResult) => void
  onClose: () => void
}

// Shared camera+geo capture primitive — used by Attendance check-in and every
// stage of the Run Camp wizard (check-in selfie, setup photo, additional
// photos, closure photo). Mirrors the prototype's openCapture()/
// captureCheckIn() (near-identical code duplicated across fo-portal.js and
// fo-camp-run.js) consolidated into one component, per the research spec's
// explicit recommendation.
const CameraGeoCapture = ({ open, title, facing = 'environment', onConfirm, onClose }: CameraGeoCaptureProps) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [snapshot, setSnapshot] = useState<string | null>(null)
  const [geo, setGeo] = useState<CaptureGeo | null>(null)
  const [geoStatus, setGeoStatus] = useState<'pending' | 'ok' | 'denied' | 'unavailable'>('pending')
  const [cameraError, setCameraError] = useState(false)

  useEffect(() => {
    if (!open) return
    setSnapshot(null)
    setGeo(null)
    setGeoStatus('pending')
    setCameraError(false)

    let cancelled = false
    navigator.mediaDevices?.getUserMedia?.({ video: { facingMode: facing } })
      .then((stream) => {
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return }
        streamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream
      })
      .catch(() => { if (!cancelled) setCameraError(true) })

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (cancelled) return
          setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy })
          setGeoStatus('ok')
        },
        () => { if (!cancelled) setGeoStatus('denied') },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
      )
    } else {
      setGeoStatus('unavailable')
    }

    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [open, facing])

  const handleSnap = () => {
    const video = videoRef.current
    if (!video) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    setSnapshot(canvas.toDataURL('image/jpeg', 0.85))
  }

  const handleRetake = () => setSnapshot(null)

  const handleConfirm = () => {
    if (!snapshot) { toast.error('Capture a photo first'); return }
    if (geoStatus !== 'ok') { toast.error('GPS not captured'); return }
    onConfirm({ dataUrl: snapshot, geo })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>

        <div className="rounded-xl overflow-hidden aspect-video flex items-center justify-center" style={{ background: '#0f172a' }}>
          {snapshot ? (
            <img src={snapshot} alt="Captured" className="w-full h-full object-cover" />
          ) : cameraError ? (
            <div className="text-center text-white/70 text-[12px] px-4">Camera unavailable — check browser permissions.</div>
          ) : (
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          )}
        </div>

        <div
          className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg w-fit"
          style={
            geoStatus === 'ok'
              ? { background: 'var(--success-soft)', color: 'var(--success)' }
              : geoStatus === 'pending'
              ? { background: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' }
              : { background: 'var(--danger-soft)', color: 'var(--danger)' }
          }
        >
          <FiMapPin size={12} />
          {geoStatus === 'ok' && geo ? `${geo.lat.toFixed(5)}, ${geo.lng.toFixed(5)} · ±${Math.round(geo.accuracy ?? 0)}m` :
            geoStatus === 'pending' ? 'Capturing GPS…' :
            geoStatus === 'denied' ? 'Location permission denied' : 'Location unavailable'}
        </div>

        <div className="flex gap-2">
          {!snapshot ? (
            <Button size="sm" onClick={handleSnap} disabled={cameraError}><FiCamera size={13} /> Snap</Button>
          ) : (
            <Button size="sm" variant="outline" onClick={handleRetake}><FiRotateCcw size={13} /> Retake</Button>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}><FiX size={13} /> Cancel</Button>
          <Button disabled={!snapshot || geoStatus !== 'ok'} onClick={handleConfirm}><FiCheck size={13} /> Use this photo</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default CameraGeoCapture
