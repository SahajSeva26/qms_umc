import { useMemo } from 'react'
import { FiZap, FiSend } from 'react-icons/fi'
import type { Doctor, EngagementBand, EngagementStats } from '@/features/doctors/doctors.types'
import BandPill from '@/features/doctors/components/BandPill'
import { formatDate } from '@/utils/formatters'

interface InactiveTabProps {
  doctors: Doctor[]
  engagementFor: (doctorId: string) => EngagementStats
  engagementBand: (e: EngagementStats) => EngagementBand
  broadcastIds: Set<string>
  onToggleBroadcast: (id: string) => void
  onOpenDoctor: (id: string) => void
}

const INACTIVE_BANDS: EngagementBand[] = ['DORMANT', 'INACTIVE', 'NEW']

const InactiveTab = ({ doctors, engagementFor, engagementBand, broadcastIds, onToggleBroadcast, onOpenDoctor }: InactiveTabProps) => {
  const rows = useMemo(() => {
    return doctors
      .map((d) => {
        const stats = engagementFor(d.id)
        return { doctor: d, stats, band: engagementBand(stats) }
      })
      .filter((r) => INACTIVE_BANDS.includes(r.band))
      .sort((a, b) => (b.stats.daysSinceLast ?? 1e9) - (a.stats.daysSinceLast ?? 1e9))
  }, [doctors, engagementFor, engagementBand])

  if (rows.length === 0) {
    return (
      <div className="text-[13px] py-10 text-center" style={{ color: 'var(--qms-text-muted)' }}>
        Every doctor has recent activity. 🎉
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-start gap-2.5 rounded-xl p-3 mb-3" style={{ background: 'var(--warning-soft)', border: '1px solid var(--warning)' }}>
        <FiZap size={15} style={{ color: 'var(--warning)' }} className="shrink-0 mt-0.5" />
        <p className="text-[12.5px]" style={{ color: 'var(--qms-text)' }}>
          Re-engagement plan: select doctors below, then jump to Broadcasts to send a re-activation message.
        </p>
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--qms-border)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr style={{ background: 'var(--qms-surface-strong)' }}>
                {['Doctor', 'Specialty', 'City', 'Last camp', 'Days idle', 'Band', ''].map((h) => (
                  <th key={h} className="text-left font-semibold px-2.5 py-2 text-[10px] uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const inBroadcast = broadcastIds.has(r.doctor.id)
                return (
                  <tr
                    key={r.doctor.id}
                    onClick={() => onOpenDoctor(r.doctor.id)}
                    className="border-t cursor-pointer transition-colors hover:bg-(--qms-surface-hover)"
                    style={{ borderColor: 'var(--qms-border)' }}
                  >
                    <td className="px-2.5 py-2 font-semibold" style={{ color: 'var(--qms-text)' }}>{r.doctor.name}</td>
                    <td className="px-2.5 py-2" style={{ color: 'var(--qms-text-soft)' }}>{r.doctor.specialty}</td>
                    <td className="px-2.5 py-2" style={{ color: 'var(--qms-text-soft)' }}>{r.doctor.city}</td>
                    <td className="px-2.5 py-2" style={{ color: 'var(--qms-text-soft)' }}>{r.stats.lastDate ? formatDate(r.stats.lastDate) : '—'}</td>
                    <td className="px-2.5 py-2 font-bold" style={{ color: 'var(--qms-text)' }}>{r.stats.daysSinceLast ?? '—'}</td>
                    <td className="px-2.5 py-2"><BandPill band={r.band} /></td>
                    <td className="px-2.5 py-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); onToggleBroadcast(r.doctor.id) }}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg border transition-colors"
                        style={inBroadcast
                          ? { borderColor: 'var(--qms-brand)', color: 'var(--qms-brand)', background: 'rgba(59,109,255,.08)' }
                          : { borderColor: 'var(--qms-border)', color: 'var(--qms-text-soft)' }}
                      >
                        <FiSend size={11} /> {inBroadcast ? 'Added' : 'Add to broadcast'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default InactiveTab
