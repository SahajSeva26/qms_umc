import { useState } from 'react'
import { FiClock, FiCheckCircle, FiMapPin, FiCamera, FiCheck, FiX } from 'react-icons/fi'
import type { Person } from '@/types/people.types'
import type { Camp } from '@/types/camp.types'
import type { Attendance } from '@/features/dedicatedops/dedicatedops.types'
import { Button } from '@/components/ui/button'
import CameraGeoCapture from '@/components/ui/CameraGeoCapture'
import { getMyAttendance, checkIn, checkOut } from '@/features/fo/components/workspace/myAttendance.service'
import { toast } from '@/components/ui/sonner'

interface AttendanceModuleProps {
  me: Person
  camps: Camp[]
}

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  IN_PROGRESS: { bg: 'var(--warning-soft)', color: 'var(--warning)' },
  CLOSED: { bg: 'var(--success-soft)', color: 'var(--success)' },
}

function formatTime(iso?: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })
}

const AttendanceModule = ({ me, camps }: AttendanceModuleProps) => {
  const [records, setRecords] = useState<Attendance[]>(() => getMyAttendance(me.id))
  const [captureOpen, setCaptureOpen] = useState(false)
  const [captureMode, setCaptureMode] = useState<'IN' | 'OUT'>('IN')

  const todayIso = new Date().toISOString().slice(0, 10)
  const today = records.find((r) => r.date === todayIso)
  const todayCamp = camps.find((c) => c.foId === me.id && c.date?.slice(0, 10) === todayIso)

  const last30 = records.slice(0, 30)

  const openCapture = (mode: 'IN' | 'OUT') => {
    setCaptureMode(mode)
    setCaptureOpen(true)
  }

  const handleConfirm = ({ dataUrl, geo }: { dataUrl: string; geo: { lat: number; lng: number; accuracy?: number } | null }) => {
    const next = captureMode === 'IN'
      ? checkIn(me.id, todayCamp?.id, dataUrl, geo)
      : checkOut(me.id, dataUrl, geo)
    setRecords(next)
    setCaptureOpen(false)
    toast.success(captureMode === 'IN' ? 'Checked in' : 'Checked out')
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border p-4 flex items-center justify-between gap-3 flex-wrap" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style={today?.checkInAt ? { background: 'var(--success-soft)', color: 'var(--success)' } : { background: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' }}
          >
            {today?.checkInAt ? <FiCheckCircle size={18} /> : <FiClock size={18} />}
          </div>
          <div>
            <div className="font-semibold text-[14px]" style={{ color: 'var(--qms-text)' }}>
              {today?.checkInAt ? `Checked in at ${formatTime(today.checkInAt)}` : 'Not checked in yet'}
            </div>
            {today?.checkOutAt && (
              <div className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>Checked out at {formatTime(today.checkOutAt)}</div>
            )}
          </div>
        </div>
        {!today?.checkInAt ? (
          <Button onClick={() => openCapture('IN')}><FiCamera size={13} /> Check in</Button>
        ) : !today?.checkOutAt ? (
          <Button variant="outline" onClick={() => openCapture('OUT')}><FiCamera size={13} /> Check out</Button>
        ) : (
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: 'var(--success-soft)', color: 'var(--success)' }}>Day complete</span>
        )}
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <div className="px-3.5 py-2.5 text-[12px] font-bold uppercase tracking-wide border-b" style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}>Last 30 logs</div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr style={{ background: 'var(--qms-surface-strong)' }}>
                {['Date', 'Check-in', 'Check-out', 'Geo', 'Selfie', 'Camp', 'Status'].map((h) => (
                  <th key={h} className="text-left font-semibold px-3 py-2 text-[11px] uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {last30.map((r) => (
                <tr key={r.id} className="border-t" style={{ borderColor: 'var(--qms-border)' }}>
                  <td className="px-3 py-2 text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>{r.date}</td>
                  <td className="px-3 py-2" style={{ color: 'var(--qms-text)' }}>{formatTime(r.checkInAt)}</td>
                  <td className="px-3 py-2" style={{ color: 'var(--qms-text)' }}>{formatTime(r.checkOutAt)}</td>
                  <td className="px-3 py-2">
                    {r.geoLat != null ? (
                      <span className="inline-flex items-center gap-1 text-[11px]" style={{ color: 'var(--qms-text-soft)' }}><FiMapPin size={11} /> {r.geoLat.toFixed(3)}, {r.geoLng?.toFixed(3)}</span>
                    ) : <span style={{ color: 'var(--qms-text-muted)' }}>—</span>}
                  </td>
                  <td className="px-3 py-2">
                    {r.selfieUrl ? <FiCheck size={14} style={{ color: 'var(--success)' }} /> : <FiX size={14} style={{ color: 'var(--qms-text-muted)' }} />}
                  </td>
                  <td className="px-3 py-2 text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>{r.projectId || '—'}</td>
                  <td className="px-3 py-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: STATUS_STYLE[r.status]?.bg, color: STATUS_STYLE[r.status]?.color }}>{r.status}</span>
                  </td>
                </tr>
              ))}
              {last30.length === 0 && (
                <tr><td colSpan={7} className="text-center py-8 text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>No attendance logs yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CameraGeoCapture
        open={captureOpen}
        title={captureMode === 'IN' ? 'Check in — selfie + GPS' : 'Check out — selfie + GPS'}
        facing="user"
        onConfirm={handleConfirm}
        onClose={() => setCaptureOpen(false)}
      />
    </div>
  )
}

export default AttendanceModule
