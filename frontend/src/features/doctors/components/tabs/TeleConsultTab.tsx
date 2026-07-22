import { useMemo, useState } from 'react'
import { FiPlus, FiVideo, FiPhone as FiPhoneIcon, FiMessageCircle, FiCheck, FiX, FiFileText, FiRotateCcw } from 'react-icons/fi'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/sonner'
import type { Doctor } from '@/features/doctors/doctors.types'
import type { TeleConsult, TeleMode, TeleStatus } from '@/features/doctors/components/tabs/TeleConsultTab.types'
import { loadTeleConsults, saveTeleConsults } from '@/features/doctors/doctors.service'
import TeleBookingModal from '@/features/doctors/components/TeleBookingModal'
import TeleCompleteModal from '@/features/doctors/components/TeleCompleteModal'
import { formatDate } from '@/utils/formatters'

interface TeleConsultTabProps {
  doctors: Doctor[]
}

const MODE_COLOR: Record<TeleMode, string> = { Video: '#8b5cf6', Phone: '#3b6dff', Chat: '#10b981' }
const STATUS_COLOR: Record<TeleStatus, string> = { SCHEDULED: '#3b6dff', COMPLETED: '#10b981', NO_SHOW: '#f43f5e', CANCELLED: '#94a3b8' }
const STATUS_FILTERS: (TeleStatus | 'ALL')[] = ['ALL', 'SCHEDULED', 'COMPLETED', 'NO_SHOW', 'CANCELLED']

const TODAY_ISO = new Date().toISOString().slice(0, 10)

function seedConsults(doctors: Doctor[]): TeleConsult[] {
  const d = (id: number) => doctors[id % Math.max(1, doctors.length)]?.id ?? ''
  const dPlus = (n: number) => { const dt = new Date(); dt.setDate(dt.getDate() + n); return dt.toISOString().slice(0, 10) }
  return [
    { id: 'tc-1', patientName: 'Rakesh Iyer', phone: '+91 9820012340', condition: 'Hypertension follow-up', doctorId: d(0), date: TODAY_ISO, time: '11:00', mode: 'Video', status: 'SCHEDULED' },
    { id: 'tc-2', patientName: 'Meena Pillai', phone: '+91 9845067890', condition: 'Diabetes review', doctorId: d(1), date: TODAY_ISO, time: '15:30', mode: 'Phone', status: 'SCHEDULED' },
    { id: 'tc-3', patientName: 'Suresh Babu', phone: '+91 9791045678', condition: 'Chest pain evaluation', referredFrom: 'C-9421', doctorId: d(3), date: dPlus(-2), time: '10:00', mode: 'Video', status: 'COMPLETED', notes: 'ECG reviewed, stable.', rx: 'Continue current medication.' },
    { id: 'tc-4', patientName: 'Anita Desai', phone: '+91 9820098765', condition: 'Thyroid consult', doctorId: d(1), date: dPlus(-1), time: '12:00', mode: 'Chat', status: 'NO_SHOW' },
    { id: 'tc-5', patientName: 'Farhan Sheikh', phone: '+91 9910011223', condition: 'Post-camp follow-up', referredFrom: 'C-9425', doctorId: d(6), date: dPlus(1), time: '16:00', mode: 'Video', status: 'SCHEDULED' },
    { id: 'tc-6', patientName: 'Geeta Nair', phone: '+91 9820055443', condition: 'Joint pain', doctorId: d(5), date: dPlus(-3), time: '09:30', mode: 'Phone', status: 'CANCELLED' },
  ]
}

const TeleConsultTab = ({ doctors }: TeleConsultTabProps) => {
  const [consults, setConsultsState] = useState<TeleConsult[]>(() => {
    const stored = loadTeleConsults()
    if (stored) return stored
    const seeded = seedConsults(doctors)
    saveTeleConsults(seeded)
    return seeded
  })

  const setConsults = (updater: (prev: TeleConsult[]) => TeleConsult[]) => {
    setConsultsState((prev) => {
      const next = updater(prev)
      saveTeleConsults(next)
      return next
    })
  }
  const [statusFilter, setStatusFilter] = useState<TeleStatus | 'ALL'>('ALL')
  const [search, setSearch] = useState('')
  const [bookingOpen, setBookingOpen] = useState(false)
  const [completeId, setCompleteId] = useState<string | null>(null)

  const doctorName = (id: string) => doctors.find((d) => d.id === id)?.name ?? id
  const doctorSpecialty = (id: string) => doctors.find((d) => d.id === id)?.specialty ?? ''

  const counts = useMemo(() => ({
    today: consults.filter((c) => c.date === TODAY_ISO).length,
    SCHEDULED: consults.filter((c) => c.status === 'SCHEDULED').length,
    COMPLETED: consults.filter((c) => c.status === 'COMPLETED').length,
    NO_SHOW: consults.filter((c) => c.status === 'NO_SHOW').length,
  }), [consults])

  const statusCounts = useMemo(() => {
    const map: Record<string, number> = { ALL: consults.length }
    STATUS_FILTERS.forEach((s) => { if (s !== 'ALL') map[s] = consults.filter((c) => c.status === s).length })
    return map
  }, [consults])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return consults.filter((c) => {
      if (statusFilter !== 'ALL' && c.status !== statusFilter) return false
      if (q) {
        const hay = `${c.patientName} ${c.phone} ${c.condition} ${doctorName(c.doctorId)}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [consults, statusFilter, search, doctors])

  const setStatus = (id: string, status: TeleStatus) => {
    setConsults((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)))
  }

  const handleBook = (rec: Omit<TeleConsult, 'id' | 'status'>) => {
    setConsults((prev) => [{ ...rec, id: `tc-${Date.now()}`, status: 'SCHEDULED' }, ...prev])
  }

  const handleSaveNotes = (notes: string, rx: string) => {
    if (!completeId) return
    setConsults((prev) => prev.map((c) => (c.id === completeId ? { ...c, notes, rx, status: 'COMPLETED' } : c)))
  }

  const completeConsult = consults.find((c) => c.id === completeId) ?? null

  return (
    <div>
      <div className="grid grid-cols-4 gap-3 mb-4">
        {[
          ['Today', counts.today, 'var(--qms-brand)'],
          ['Scheduled', counts.SCHEDULED, '#3b6dff'],
          ['Completed', counts.COMPLETED, '#10b981'],
          ['No-shows', counts.NO_SHOW, '#f43f5e'],
        ].map(([label, value, color]) => (
          <div key={label as string} className="rounded-xl border p-3" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
            <div className="text-lg font-extrabold" style={{ color: color as string }}>{value}</div>
            <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{label}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className="text-[12px] font-semibold px-3 py-1.5 rounded-full transition-colors"
              style={statusFilter === s
                ? { background: 'var(--qms-brand)', color: '#fff' }
                : { background: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' }}
            >
              {s === 'ALL' ? 'All' : s.replace('_', '-')} <span className="opacity-80">{statusCounts[s]}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search patient · phone · condition" className="text-[12.5px] w-64" />
          <button
            onClick={() => setBookingOpen(true)}
            className="flex items-center gap-1.5 text-[12.5px] font-bold px-3 py-2 rounded-xl text-white shrink-0"
            style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
          >
            <FiPlus size={13} /> Book tele-consult
          </button>
        </div>
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--qms-border)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr style={{ background: 'var(--qms-surface-strong)' }}>
                {['Patient', 'Doctor', 'When', 'Mode', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="text-left font-semibold px-2.5 py-2 text-[10px] uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-t" style={{ borderColor: 'var(--qms-border)' }}>
                  <td className="px-2.5 py-2">
                    <div className="font-semibold" style={{ color: 'var(--qms-text)' }}>{c.patientName}</div>
                    <div className="text-[10px]" style={{ color: 'var(--qms-text-muted)' }}>{c.phone} · {c.condition}</div>
                  </td>
                  <td className="px-2.5 py-2">
                    <div style={{ color: 'var(--qms-text)' }}>{doctorName(c.doctorId)}</div>
                    <div className="text-[10px]" style={{ color: 'var(--qms-text-muted)' }}>{doctorSpecialty(c.doctorId)}</div>
                  </td>
                  <td className="px-2.5 py-2" style={{ color: 'var(--qms-text-soft)' }}>{formatDate(c.date)} · {c.time}</td>
                  <td className="px-2.5 py-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${MODE_COLOR[c.mode]}1a`, color: MODE_COLOR[c.mode] }}>{c.mode}</span>
                  </td>
                  <td className="px-2.5 py-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${STATUS_COLOR[c.status]}1a`, color: STATUS_COLOR[c.status] }}>{c.status.replace('_', ' ')}</span>
                  </td>
                  <td className="px-2.5 py-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {c.status === 'SCHEDULED' && (
                        <>
                          <button
                            onClick={() => toast.info(`Joining ${c.mode} room (demo)`)}
                            className="inline-flex items-center gap-1 text-[10.5px] font-semibold px-2 py-1 rounded-lg border"
                            style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-soft)' }}
                          >
                            {c.mode === 'Video' ? <FiVideo size={11} /> : c.mode === 'Phone' ? <FiPhoneIcon size={11} /> : <FiMessageCircle size={11} />} Start
                          </button>
                          <button
                            onClick={() => setCompleteId(c.id)}
                            className="inline-flex items-center gap-1 text-[10.5px] font-semibold px-2 py-1 rounded-lg border"
                            style={{ borderColor: 'var(--success)', color: 'var(--success)' }}
                          >
                            <FiCheck size={11} /> Complete
                          </button>
                          <button
                            onClick={() => setStatus(c.id, 'NO_SHOW')}
                            className="inline-flex items-center justify-center w-6 h-6 rounded-lg border"
                            style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}
                            aria-label="No-show"
                          >
                            <FiX size={12} />
                          </button>
                          <button
                            onClick={() => setStatus(c.id, 'CANCELLED')}
                            className="inline-flex items-center justify-center w-6 h-6 rounded-lg border"
                            style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
                            aria-label="Cancel"
                          >
                            <FiX size={12} />
                          </button>
                        </>
                      )}
                      {c.status === 'COMPLETED' && (
                        <button
                          onClick={() => setCompleteId(c.id)}
                          className="inline-flex items-center gap-1 text-[10.5px] font-semibold px-2 py-1 rounded-lg border"
                          style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-soft)' }}
                        >
                          <FiFileText size={11} /> Notes/Rx
                        </button>
                      )}
                      {(c.status === 'NO_SHOW' || c.status === 'CANCELLED') && (
                        <button
                          onClick={() => setStatus(c.id, 'SCHEDULED')}
                          className="inline-flex items-center gap-1 text-[10.5px] font-semibold px-2 py-1 rounded-lg border"
                          style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-soft)' }}
                        >
                          <FiRotateCcw size={11} /> Reschedule
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="text-center py-6 text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>No tele-consults match this view.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <TeleBookingModal open={bookingOpen} doctors={doctors} onClose={() => setBookingOpen(false)} onBook={handleBook} />
      <TeleCompleteModal open={!!completeId} consult={completeConsult} onClose={() => setCompleteId(null)} onSave={handleSaveNotes} />
    </div>
  )
}

export default TeleConsultTab
