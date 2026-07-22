import { useState } from 'react'
import { FiMapPin, FiCamera, FiRotateCcw, FiClock, FiAlertTriangle } from 'react-icons/fi'
import { Button } from '@/components/ui/button'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/sonner'
import CameraGeoCapture, { type CaptureResult } from '@/components/ui/CameraGeoCapture'
import { DEFAULT_DELAY_REASONS } from '@/features/fo/foConfig.types'

export type DelayBand = 'EARLY' | 'ON_TIME' | 'DELAYED' | 'VERY_DELAYED'

export function delayBand(mins: number): DelayBand {
  if (mins <= -5) return 'EARLY'
  if (mins <= 5) return 'ON_TIME'
  if (mins <= 30) return 'DELAYED'
  return 'VERY_DELAYED'
}

const BAND_META: Record<DelayBand, { label: string; bg: string; color: string }> = {
  EARLY: { label: 'EARLY', bg: 'var(--qms-surface-strong)', color: 'var(--qms-brand)' },
  ON_TIME: { label: 'ON TIME', bg: 'var(--success-soft)', color: 'var(--success)' },
  DELAYED: { label: 'DELAYED', bg: 'var(--warning-soft)', color: 'var(--warning)' },
  VERY_DELAYED: { label: 'VERY DELAYED', bg: 'var(--danger-soft)', color: 'var(--danger)' },
}

// Parses camp.slot ("9-1" / "9 AM – 1 PM" / "09:00") for a planned HH:MM start,
// defaulting to 09:00 when unparsable — matches fo-camp-run.js's plannedStart().
export function plannedStartTime(slot: string | undefined, dateIso: string): Date {
  const base = new Date(dateIso)
  let h = 9
  let m = 0
  if (slot) {
    const match = slot.match(/(\d{1,2})(?::(\d{2}))?/)
    if (match) {
      h = Number(match[1])
      m = match[2] ? Number(match[2]) : 0
    }
  }
  base.setHours(h, m, 0, 0)
  return base
}

interface CheckInStageProps {
  campSlot: string
  campDate: string
  checkInAt?: string
  checkInGeo?: { lat: number; lng: number; accuracy?: number } | null
  selfieDataUrl?: string
  checkInDelayMins?: number
  checkInDelayReason?: string
  onCheckIn: (patch: { checkInAt: string; checkInGeo: { lat: number; lng: number; accuracy?: number }; selfieDataUrl: string; checkInDelayMins: number }) => void
  onSaveDelayReason: (reason: string, notes: string) => void
}

const CheckInStage = ({
  campSlot, campDate, checkInAt, checkInGeo, selfieDataUrl, checkInDelayMins, checkInDelayReason,
  onCheckIn, onSaveDelayReason,
}: CheckInStageProps) => {
  const [captureOpen, setCaptureOpen] = useState(false)
  const [delayReason, setDelayReason] = useState('')
  const [delayNotes, setDelayNotes] = useState('')

  const planned = plannedStartTime(campSlot, campDate)

  const handleConfirm = (result: CaptureResult) => {
    if (!result.geo) { toast.error('GPS not captured'); return }
    const now = new Date()
    const mins = Math.round((now.getTime() - planned.getTime()) / 60000)
    onCheckIn({ checkInAt: now.toISOString(), checkInGeo: result.geo, selfieDataUrl: result.dataUrl, checkInDelayMins: mins })
    setCaptureOpen(false)
  }

  if (!checkInAt) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="w-full max-w-md rounded-2xl border p-6 text-center space-y-4" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
          <div className="w-14 h-14 mx-auto rounded-full flex items-center justify-center" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-brand)' }}>
            <FiMapPin size={26} />
          </div>
          <div>
            <div className="text-[15px] font-bold" style={{ color: 'var(--qms-text)' }}>Ready to begin</div>
            <div className="text-[12.5px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>
              We'll need camera + location permission to record your check-in selfie and GPS.
            </div>
          </div>
          <div className="flex items-center justify-center gap-1.5 text-[12px] font-semibold" style={{ color: 'var(--qms-text-muted)' }}>
            <FiClock size={13} /> Planned start: {planned.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
          <Button className="w-full" onClick={() => setCaptureOpen(true)}><FiCamera size={14} /> Check in now</Button>
        </div>

        <CameraGeoCapture open={captureOpen} title="Check-in selfie" facing="user" onConfirm={handleConfirm} onClose={() => setCaptureOpen(false)} />
      </div>
    )
  }

  const mins = checkInDelayMins ?? 0
  const band = delayBand(mins)
  const meta = BAND_META[band]
  const needsReason = (band === 'DELAYED' || band === 'VERY_DELAYED') && !checkInDelayReason

  return (
    <div className="max-w-lg mx-auto space-y-3">
      <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <div className="px-4 py-2.5 border-b flex items-center justify-between" style={{ borderColor: 'var(--qms-border)' }}>
          <div className="text-[12px] font-bold uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>Check-in record</div>
          <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full" style={{ background: meta.bg, color: meta.color }}>{meta.label}</span>
        </div>
        <div className="p-4 flex gap-4">
          {selfieDataUrl && (
            <img src={selfieDataUrl} alt="Check-in selfie" className="w-20 h-20 rounded-lg object-cover shrink-0 border" style={{ borderColor: 'var(--qms-border)' }} />
          )}
          <div className="flex-1 min-w-0 space-y-1 text-[12.5px]">
            <div style={{ color: 'var(--qms-text)' }}>
              <span className="font-semibold">Checked in:</span> {new Date(checkInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              <span style={{ color: 'var(--qms-text-muted)' }}> · planned {planned.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div style={{ color: 'var(--qms-text-muted)' }}>
              {mins >= 0 ? `${mins} min after planned start` : `${Math.abs(mins)} min before planned start`}
            </div>
            {checkInGeo && (
              <div className="flex items-center gap-1" style={{ color: 'var(--qms-text-muted)' }}>
                <FiMapPin size={11} /> {checkInGeo.lat.toFixed(5)}, {checkInGeo.lng.toFixed(5)} · ±{Math.round(checkInGeo.accuracy ?? 0)}m
              </div>
            )}
            {checkInDelayReason && (
              <div className="text-[11.5px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>Delay reason: <span className="font-semibold">{checkInDelayReason}</span></div>
            )}
          </div>
        </div>
        <div className="px-4 pb-3">
          <Button size="sm" variant="outline" onClick={() => setCaptureOpen(true)}><FiRotateCcw size={13} /> Re-capture check-in</Button>
        </div>
      </div>

      {needsReason && (
        <div className="rounded-xl border p-4 space-y-3" style={{ background: 'var(--warning-soft)', borderColor: 'color-mix(in oklab, var(--warning) 40%, transparent)' }}>
          <div className="flex items-center gap-2 text-[12.5px] font-bold" style={{ color: 'var(--warning)' }}>
            <FiAlertTriangle size={14} /> Delay reason required
          </div>
          <Select value={delayReason} onValueChange={(v) => setDelayReason(v ?? '')}>
            <SelectTrigger className="w-full bg-white"><SelectValue placeholder="Select reason" /></SelectTrigger>
            <SelectContent>
              {DEFAULT_DELAY_REASONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
          <Textarea placeholder="Optional notes" value={delayNotes} onChange={(e) => setDelayNotes(e.target.value)} rows={2} className="bg-white" />
          <Button
            size="sm"
            disabled={!delayReason}
            onClick={() => { onSaveDelayReason(delayReason, delayNotes); setDelayReason(''); setDelayNotes('') }}
          >
            Save delay reason
          </Button>
        </div>
      )}

      <CameraGeoCapture open={captureOpen} title="Check-in selfie" facing="user" onConfirm={handleConfirm} onClose={() => setCaptureOpen(false)} />
    </div>
  )
}

export default CheckInStage
